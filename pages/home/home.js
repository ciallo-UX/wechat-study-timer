const app = getApp();
Page({

  data: {
    name: "",
    credit: "",
    list: [],
    todayTime: "00:00",
    todayCount: 0
  },

  onLoad() {
    this.getList();
  },

  setName(e) { this.setData({ name: e.detail.value }) },
  setCredit(e) { this.setData({ credit: e.detail.value }) },

  fmt(s) {
    let m = Math.floor(s / 60);
    let sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  },

  getList() {
    let list = wx.getStorageSync('tasks') || [];
    list = list.map(item => ({
      ...item,
      totalLearned: item.totalLearned || 0,
      totalStr: this.fmt(item.totalSeconds),
      leftStr: this.fmt(item.left)
    }));
    this.setData({ list });
    this.updateTotal();
  },

  saveList(list) {
    const rawList = list.map(({ totalStr, leftStr, ...rest }) => rest);
    wx.setStorageSync('tasks', rawList);
    const formattedList = list.map(item => ({
      ...item,
      totalLearned: item.totalLearned || 0,
      totalStr: this.fmt(item.totalSeconds),
      leftStr: this.fmt(item.left)
    }));
    this.setData({ list: formattedList });
    this.updateTotal();
  },

  addTask() {
    let { name, credit } = this.data;
    if (!name || !credit) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    let total = Number(credit) * 25 * 60;
    let task = {
      id: Date.now(),
      name,
      credit: Number(credit),
      totalSeconds: total,
      left: total,
      done: 0,
      totalLearned: 0
    };
    let list = [...this.data.list, task];
    this.saveList(list);
    this.setData({ name: "", credit: "" });
  },

  // ========== 修复：精准系统时间计时，每秒+1，后台不掉 ==========
  start(e) {
    let id = e.currentTarget.dataset.id;
    let list = this.data.list;
    let task = list.find(i => i.id == id);

    // 清空已有计时器
    if (app.globalData.timer) clearInterval(app.globalData.timer);
    app.globalData.runningId = id;

    // 记录上一次的时间戳（核心）
    let lastTime = Date.now();

    app.globalData.timer = setInterval(() => {
      // 获取当前时间
      const now = Date.now();
      // 计算时间差（秒）
      const delta = Math.floor((now - lastTime) / 1000);
      
      // 只有大于0秒才更新（避免重复执行）
      if(delta > 0){
        // 剩余时间递减
        task.left -= delta;
        // 总时长只加 流逝的秒数（每秒+1，精准！）
        task.totalLearned += delta;
        // 刷新时间
        lastTime = now;

        // 计时完成逻辑
        if (task.left <= 0) {
          clearInterval(app.globalData.timer);
          app.globalData.timer = null;
          app.globalData.runningId = null;
          task.done += 1;
          task.left = task.totalSeconds;
          this.saveList(list);
          return;
        }
        this.saveList(list);
      }
    }, 200); // 高频检查，不影响性能
  },

  // 暂停功能
  stop(e) {
    let id = e.currentTarget.dataset.id;
    if (app.globalData.runningId != id) return;
    clearInterval(app.globalData.timer);
    app.globalData.timer = null;
    app.globalData.runningId = null;
  },

  // 删除任务
  deleteTask(e) {
    let id = e.currentTarget.dataset.id;
    let list = this.data.list;
    
    if(app.globalData.runningId == id){
      clearInterval(app.globalData.timer);
      app.globalData.timer = null;
      app.globalData.runningId = null;
    }

    let newList = list.filter(item => item.id != id);
    this.saveList(newList);
    wx.showToast({ title: '删除成功', icon: 'success' });
  },

  updateTotal() {
    let list = this.data.list;
    let count = list.reduce((sum, i) => sum + i.done, 0);
    let time = list.reduce((sum, i) => sum + i.totalLearned, 0);
    this.setData({
      todayCount: count,
      todayTime: this.fmt(time)
    });
  }
});