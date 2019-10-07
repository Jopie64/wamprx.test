import { makeChannel$, runWithChannel } from './channel'
import { mergeMap, map } from 'rxjs/operators';
import { of, from, using, combineLatest } from 'rxjs';
import { WampChannel } from 'wamprx';
import { range } from 'ramda';

const channel$ = makeChannel$('ws://localhost:25000/ws', 'realm1');

export const runLoadTest = () => runWithChannel(channel$, runLoadTestWithChannel);

var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'; //0123456789';

const makeRandomName = (length: number) =>
    range(0, length).reduce((a, c) => a + characters.charAt(Math.floor(Math.random() * characters.length)), '')

const runLoadTestWithChannel = async (channel: WampChannel) => {
    //const fnames = range(0, 2000).map(n => `greetMe${n}`);
    const fnames = range(0, 2000).map(n => makeRandomName(500));
    console.log('Connected. Begin test...', fnames[0]);
    const start = process.hrtime();
    const result = await combineLatest(
        fnames.map(fname => from(channel.register(fname, ([name]) => of([[`Hello ${name}!`]]))).pipe(
            mergeMap(r => using(() => r, _ => channel.call(fname, ['Johan']))),
            map(([[result]]) => result === 'Hello Johan!'))
        ))
        .toPromise();
    const duration = process.hrtime(start);
    console.log(`Result ${(duration[0] + duration[1] / 1000000000).toFixed(3)}s`, result.length, result.reduce((a, c) => a && c));
    console.log('Done');
}
