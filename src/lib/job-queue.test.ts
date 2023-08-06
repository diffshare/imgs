import { JobQueue } from './job-queue';  // Update the path accordingly

describe('JobQueue', () => {
    it('should add tasks to the queue and execute them', async () => {
        const queue = new JobQueue('test');

        const mockTask1 = jest.fn().mockResolvedValue('task1');
        const mockTask2 = jest.fn().mockResolvedValue('task2');
        
        expect(queue.length).toBe(0);

        queue.enqueue(mockTask1);
        queue.enqueue(mockTask2);

        // Because tasks are executed asynchronously, we should wait a bit
        await new Promise(r => setTimeout(r, 1000));

        expect(queue.length).toBe(0);
        expect(mockTask1).toHaveBeenCalled();
        expect(mockTask2).toHaveBeenCalled();
    });

    it('should stop executing tasks when stop is called', async () => {
        const queue = new JobQueue('test');

        const mockTask1 = jest.fn().mockImplementation(() => new Promise(r => setTimeout(r, 1000, 'task1')));
        const mockTask2 = jest.fn().mockResolvedValue('task2');
        
        expect(queue.length).toBe(0);

        queue.enqueue(mockTask1);
        queue.enqueue(mockTask2);

        queue.stop();

        // Because tasks are executed asynchronously, we should wait a bit
        await new Promise(r => setTimeout(r, 1000));

        expect(queue.length).toBe(1);
        expect(mockTask1).toHaveBeenCalled();
        expect(mockTask2).not.toHaveBeenCalled();
    });
});