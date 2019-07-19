import * as WebSocket from 'ws';
import { connectWampChannel, makeObservableWebSocket } from 'wamprx';
import { switchMap, map } from 'rxjs/operators';
import { merge } from 'rxjs';

console.log('Play around with beatbox on https://demo.crossbar.io/beatbox/index.html');
console.log('Use channel 692497');

const myMakeObsWs = makeObservableWebSocket(
    (url, protocol) => new WebSocket(url, protocol));

connectWampChannel('wss://demo.crossbar.io/ws', 'crossbardemo', undefined, myMakeObsWs).pipe(
    switchMap(channel => merge(
        channel.subscribe('io.crossbar.demo.beatbox.692497.pad_down').pipe(map(([, received]) => ({down: received}))),
        channel.subscribe('io.crossbar.demo.beatbox.692497.pad_up').pipe(map(([, received]) => ({up: received})))
    )))
    .subscribe(received => console.log('Received: ' + JSON.stringify(received!)));
