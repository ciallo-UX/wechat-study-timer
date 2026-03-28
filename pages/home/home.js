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
    // 兼容旧数据，给没有totalLearned的任务补上默认值
    list = list.map(item => ({
      ...item,
      totalLearned: item.totalLearned || 0, // 累计学习秒数（永久保存）
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
      totalLearned: 0 // 新增：累计学习秒数
    };
    let list = [...this.data.list, task];
    this.saveList(list);
    this.setData({ name: "", credit: "" });
  },

  start(e) {
    let id = e.currentTarget.dataset.id;
    let list = this.data.list;
    let task = list.find(i => i.id == id);

    if (app.globalData.timer) clearInterval(app.globalData.timer);
    app.globalData.runningId = id;

    app.globalData.timer = setInterval(() => {
      if (task.left <= 0) {
        clearInterval(app.globalData.timer);
        app.globalData.timer = null;
        app.globalData.runningId = null;
        task.done += 1;
        task.left = task.totalSeconds;
        this.saveList(list);
        return;
      }
      task.left -= 1;
      task.totalLearned += 1; // 每秒学习时间永久累计
      this.saveList(list);
    }, 1000);
  },

  stop(e) {
    let id = e.currentTarget.dataset.id;
    if (app.globalData.runningId != id) return;
    clearInterval(app.globalData.timer);
    app.globalData.timer = null;
    app.globalData.runningId = null;
  },

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

  // 核心修改：总时长改为「累计学习秒数之和」
  updateTotal() {
    let list = this.data.list;
    let count = list.reduce((sum, i) => sum + i.done, 0);
    // 总时长 = 所有任务累计学习秒数相加（不会清零）
    let time = list.reduce((sum, i) => sum + i.totalLearned, 0);
    this.setData({
      todayCount: count,
      todayTime: this.fmt(time)
    });
  }
});