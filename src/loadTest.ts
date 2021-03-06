import { makeChannel$, runWithChannel } from './channel'
import { mergeMap, map, shareReplay, take, reduce, mergeAll, scan } from 'rxjs/operators';
import { of, from, using, combineLatest, NEVER, concat, merge } from 'rxjs';
import { WampChannel } from 'wamprx';
import { range } from 'ramda';


const nFunctions = 6000;
const nNameLength = 500;
const nCalls = 1;

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
    console.log(`Connected. Function name length: ${nNameLength}. Example: ${fnames[0].substr(0, 20)}${nNameLength > 20 ? '...' : ''} Begin test...`);

    console.log(`Registering ${nFunctions} functions...`);
    const start = process.hrtime.bigint();
    const registrations$ = combineLatest(
        fnames.map(fname => from(channel.register(fname, ([name]: any) => of([[`Hello ${name}!`]]))).pipe(
            mergeMap(r => using(() => r, _ => concat(of(true), NEVER)))
        ))
    ).pipe(shareReplay({bufferSize: 1, refCount: true }));
    const registrations = registrations$.subscribe();
    const regResult = await registrations$.pipe(take(1)).toPromise();

    const registeredTs = process.hrtime.bigint();

    console.log(`Registered ${regResult.length} functions in ${printTime(registeredTs - start)}s. Calling ${nCalls} times...`);
    const result = await merge(fnames.map(
        fname => merge(range(0, nCalls).map(n => channel.call(fname, [`Johan ${n}`]).pipe(
                map(([[result]]: any) => result === `Hello Johan ${n}!`))
        )).pipe(mergeAll())
    )).pipe(
        mergeAll(),
        reduce(({ok, error}, c) => c ? { ok: ok + 1, error} : {ok, error: error + 1}, {ok: 0, error: 0}))
        .toPromise();

    const calledTs = process.hrtime.bigint();
    console.log(`Called in ${printTime(calledTs - registeredTs)}s Unregistering...`);
    registrations.unsubscribe();
    const duration = process.hrtime.bigint() - start;
    const resultOk = result.error === 0;
    if (resultOk) {
        console.log(`Result ${printTime(duration)}s`, result.ok);
    } else {
        console.error(`Result error ${printTime(duration)}s`, result);
    }
}
