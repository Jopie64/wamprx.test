import * as WebSocket from 'ws';
import { connectWampChannel, makeObservableWebSocket } from 'wamprx';
import { switchMap } from 'rxjs/operators';

console.log('Play around with beatbox on https://demo.crossbar.io/beatbox/index.html');

const myMakeObsWs = makeObservableWebSocket(
    (url, protocol) => new WebSocket(url, protocol));

connectWampChannel('wss://demo.crossbar.io/ws', 'crossbardemo', undefined, myMakeObsWs).pipe(
    switchMap(channel => channel.subscribe('io.crossbar.demo.beatbox.692497.pad_down')))
    .subscribe(([,received]) => console.log('Received: ' + Object.keys(received!)));
