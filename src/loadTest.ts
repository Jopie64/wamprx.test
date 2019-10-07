import { makeChannel$, runWithChannel } from './channel'
import { mergeMap, map, shareReplay, take, reduce } from 'rxjs/operators';
import { of, from, using, combineLatest, NEVER, concat, merge } from 'rxjs';
import { WampChannel } from 'wamprx';
import { range } from 'ramda';


const nFunctions = 2000;
const nNameLength = 500;
const nCalls = 3;

const channel$ = makeChannel$('ws://localhost:25000/ws', 'realm1');

export const runLoadTest = () => runWithChannel(channel$, runLoadTestWithChannel);

var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'; //0123456789';

const makeRandomName = (length: number) =>
    range(0, length).reduce((a, c) => a + characters.charAt(Math.floor(Math.random() * characters.length)), '');

const printTime = (t: bigint) =>
    Number(t / 1000000n) / 1000;

const runLoadTestWithChannel = async (channel: WampChannel) => {
    //const fnames = range(0, 2000).map(n => `greetMe${n}`);
    const fnames = range(0, nFunctions).map(n => makeRandomName(nNameLength));
    console.log('Connected. Begin test...', fnames[0]);

    console.log('Registering...');
    const start = process.hrtime.bigint();
    const registrations$ = combineLatest(
        fnames.map(fname => from(channel.register(fname, ([name]: any) => of([[`Hello ${name}!`]]))).pipe(
            mergeMap(r => using(() => r, _ => concat(of(true), NEVER)))
        ))
    ).pipe(shareReplay({bufferSize: 1, refCount: true }));
    const registrations = registrations$.subscribe();
    const regResult = await registrations$.pipe(take(1)).toPromise();

    const registeredTs = process.hrtime.bigint();

    console.log(`Registered ${regResult.length} functions in ${printTime(registeredTs - start)}s. Calling...`);
    const result = await combineLatest(fnames.map(
        fname => combineLatest(range(0, nCalls).map(n => channel.call(fname, [`Johan ${n}`]).pipe(
                map(([[result]]: any) => result === `Hello Johan ${n}!`))
        )).pipe(map(r => r.reduce((a, c) => a && c)))
    )).toPromise();

    const calledTs = process.hrtime.bigint();
    console.log(`Called in ${printTime(calledTs - registeredTs)}s Unregistering...`);
    registrations.unsubscribe();
    const duration = process.hrtime.bigint() - start;
    console.log(`Result ${printTime(duration)}s`, result.length, result.reduce((a, c) => a && c));
}
