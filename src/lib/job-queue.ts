export class JobQueue {

    q: any[] = [];
  
    starting = false;
  
    get length() {
      return this.q.length;
    }
  
    constructor(public name: string) {
    }
  
    enqueue(task: any) {
      this.log('qneueue ' + this.name);
      this.q.push(task);
      this.start();
    }
  
    start() {
      if (this.starting) {
        return;
      }
  
      this.starting = true;
      this.doTask();
    }
  
    stop() {
      this.log('stop ' + this.name);
      this.starting = false;
    }
  
    async doTask() {
  
      while (this.q.length > 0) {
        this.log('doTask ' + this.q.length + ' ' + this.name);
        const first = this.q[0];
        await first();
        this.q.shift();
        this.log('endTask ' + this.q.length + ' ' + this.name);
      }
  
      this.stop();
    }
  
    log(message: string) {
      // console.log(message);
    }
  }