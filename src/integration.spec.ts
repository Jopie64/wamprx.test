import { describe, it, expect } from 'vitest';
import { connectWampChannel, wampCall, toWampFunc, makeObservableWebSocket, toPromise } from 'wamprx';
import WebSocket from 'ws';
import { of, firstValueFrom } from 'rxjs';

const makeObsWs = makeObservableWebSocket((url, protocol) => new WebSocket(url, protocol));

describe('wamprx integration tests with local Crossbar router', () => {
    it('connects, registers RPC, calls RPC and returns correct result', async () => {
        const channel = await toPromise(connectWampChannel('ws://localhost:25000/ws', 'realm1', undefined, makeObsWs));
        expect(channel).toBeDefined();

        const procName = 'com.test.addNumbers';
        const registration = await channel.register(procName, toWampFunc((a: number, b: number) => of(a + b)));
        expect(registration).toBeDefined();

        const result = await firstValueFrom(wampCall(channel, procName, 25, 17));
        expect(result).toBe(42);

        registration.unsubscribe();
        channel.unsubscribe();
    });

    it('supports pub/sub events between channels', async () => {
        const subChannel = await toPromise(connectWampChannel('ws://localhost:25000/ws', 'realm1', undefined, makeObsWs));
        const pubChannel = await toPromise(connectWampChannel('ws://localhost:25000/ws', 'realm1', undefined, makeObsWs));
        const topic = 'com.test.myTopic';

        const event$ = subChannel.subscribe(topic);
        const eventPromise = firstValueFrom(event$);

        await pubChannel.publish(topic, ['hello world']);
        const [args] = await eventPromise;

        expect(args?.[0]).toBe('hello world');

        subChannel.unsubscribe();
        pubChannel.unsubscribe();
    });
});
