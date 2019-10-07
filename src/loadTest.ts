import { makeChannel$, runWithChannel } from './channel'
import { mergeMap, map } from 'rxjs/operators';
import { of, from, using, combineLatest } from 'rxjs';
import { WampChannel } from 'wamprx';
import { range } from 'ramda';

const channel$ = makeChannel$('ws://localhost:25000/ws', 'realm1');

export const runLoadTest = () => runWithChannel(channel$, runLoadTestWithChannel);

const runLoadTestWithChannel = async (channel: WampChannel) => {
    const fnames = range(0, 2000).map(n => `greetMe${n}`);
    console.log('Connected. Begin test...');
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
