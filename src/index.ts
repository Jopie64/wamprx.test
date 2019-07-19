import * as WebSocket from 'ws';
import { connectWampChannel, makeObservableWebSocket } from 'wamprx';
import { switchMap, map, shareReplay } from 'rxjs/operators';
import { merge, interval } from 'rxjs';

console.log('Play around with beatbox on https://demo.crossbar.io/beatbox/index.html');
console.log('Use channel 692497');

interface BeatboxMsg {
    b: number,
    t: 0
}

const myMakeObsWs = makeObservableWebSocket(
    (url, protocol) => new WebSocket(url, protocol));

const channel$ = connectWampChannel(
    'wss://demo.crossbar.io/ws', 'crossbardemo', undefined, myMakeObsWs
).pipe(
    shareReplay({ bufferSize: 1, refCount: true }));

channel$.pipe(
    switchMap(channel => merge(
        channel.subscribe('io.crossbar.demo.beatbox.692497.pad_down').pipe(map(([, received]) => ({down: received}))),
        channel.subscribe('io.crossbar.demo.beatbox.692497.pad_up').pipe(map(([, received]) => ({up: received})))
    )))
    .subscribe(received => console.log('Received: ' + JSON.stringify(received!)));

channel$.pipe(
    switchMap(channel => interval(1000).pipe(
        switchMap(seq => seq % 2 === 0
            ? channel.publish('io.crossbar.demo.beatbox.692497.pad_down', [], {b: (seq / 2) % 4, t: 0})
            : channel.publish('io.crossbar.demo.beatbox.692497.pad_up', [], {b: ((seq - 1) / 2) % 4, t: 0})
        )
    ))
).subscribe(pubId => console.log(`Publication id: ${pubId}`));
