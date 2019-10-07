import * as WebSocket from 'ws';
import { makeObservableWebSocket, connectWampChannel, WampChannel } from 'wamprx';
import { shareReplay, switchMap, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const myMakeObsWs = makeObservableWebSocket(
    (url, protocol) => new WebSocket(url, protocol));

export const makeChannel$ = (uri: string, realm: string) => connectWampChannel(
    uri, realm, undefined,
    myMakeObsWs//, makeConsoleLogger
).pipe(
    shareReplay({ bufferSize: 1, refCount: true }));

export const runWithChannel = <T>(channel$: Observable<WampChannel>, f: (channel: WampChannel) => Promise<T>): Promise<T> =>
    channel$.pipe(switchMap(f), take(1)).toPromise();
