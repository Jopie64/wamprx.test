import { makeChannel$, runWithChannel } from './channel'
import { mergeMap, map } from 'rxjs/operators';
import { of, from, using } from 'rxjs';
import { WampChannel } from 'wamprx';

const channel$ = makeChannel$('ws://localhost:25000/ws', 'realm1');

export const runLoadTest = () => runWithChannel(channel$, runLoadTestWithChannel);

const runLoadTestWithChannel = async (channel: WampChannel) => {
    console.log('Connected. Begin test...');
    const result = await from(channel.register('greetMe', ([name]) => of([[`Hello ${name}!`]]))).pipe(
        mergeMap(r => using(() => r, _ => channel.call('greetMe', ['Johan']))),
        map(([[result]]) => result === 'Hello Johan!'))
        .toPromise();
    console.log('Result', result);
    console.log('Done');
}
