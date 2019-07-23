import * as WebSocket from 'ws';
import { connectWampChannel, makeObservableWebSocket, makeConsoleLogger, WampChannel } from 'wamprx';
import { switchMap, map, shareReplay, flatMap, take } from 'rxjs/operators';
import { merge, interval, using, of, never, from } from 'rxjs';

console.log('Play around with beatbox on https://demo.crossbar.io/beatbox/index.html');
console.log('Use channel 692497');

interface BeatboxMsg {
    b: number,
    t: 0
}

const myMakeObsWs = makeObservableWebSocket(
    (url, protocol) => new WebSocket(url, protocol));

const channel$ = connectWampChannel(
    'wss://demo.crossbar.io/ws', 'crossbardemo', undefined,
    myMakeObsWs, makeConsoleLogger
).pipe(
    shareReplay({ bufferSize: 1, refCount: true }));

channel$.pipe(
    switchMap(channel => merge(
        channel.subscribe('io.crossbar.demo.beatbox.692497.pad_down').pipe(map(([, received]) => ({down: received}))),
        channel.subscribe('io.crossbar.demo.beatbox.692497.pad_up').pipe(map(([, received]) => ({up: received})))
    )))
    .subscribe(received => console.log('Received: ' + JSON.stringify(received!)));


/*
channel$.pipe(
    switchMap(channel => interval(1000).pipe(
        switchMap(seq => seq % 2 === 0
            ? channel.publish('io.crossbar.demo.beatbox.692497.pad_down', [], {b: (seq / 2) % 4, t: 0})
            : channel.publish('io.crossbar.demo.beatbox.692497.pad_up', [], {b: ((seq - 1) / 2) % 4, t: 0})
        )
    ))
).subscribe(pubId => console.log(`Publication id: ${pubId}`));
*/

const callTestAdd = (channel: WampChannel) => interval(1000).pipe(
    take(10),
    flatMap(seq =>
        channel.call('io.crossbar.demo.testAdd', [seq, seq + 1]).pipe(
            map(([[answer]]) => `${seq} + ${seq + 1} = ${answer}`))
    ));

channel$.pipe(
    switchMap(channel =>
        from(channel.register('io.crossbar.demo.testAdd',
            ([a, b]) => of([[a + b]])
        )).pipe(
            flatMap(reg => using(() => reg, _ =>
                callTestAdd(channel))))
    ))
    .subscribe(answer => console.log(`Sum: ${answer}`));
