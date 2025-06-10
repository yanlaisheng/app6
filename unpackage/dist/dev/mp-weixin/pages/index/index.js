"use strict";
const common_vendor = require("../../common/vendor.js");
const BASE_URL = "https://monitor.sanli.cn:3000/api";
const _sfc_main = {
  data() {
    return {
      deviceList: [],
      // 改为空数组，等待API获取数据
      selectedIndex: 0,
      deviceStatus: {
        isOnline: false,
        dtuNo: "",
        deviceName: "",
        rcvTime: "",
        voltageAB: "",
        voltageBC: "",
        voltageCA: "",
        currentA: "",
        currentB: "",
        currentC: "",
        energy: "",
        pressure: "",
        relayStatus: ""
      },
      timer: null,
      onlineDevices: [],
      showPicker: false
    };
  },
  onLoad() {
    this.fetchDeviceList().then(() => {
      if (this.deviceList.length > 0) {
        this.startPolling();
      }
    });
  },
  onUnload() {
    this.stopPolling();
  },
  computed: {
    formattedTime() {
      if (!this.deviceStatus.rcvTime)
        return "--";
      const date = new Date(this.deviceStatus.rcvTime);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${date.getFullYear()}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    }
  },
  methods: {
    // 添加获取设备列表的方法
    async fetchDeviceList() {
      try {
        const res = await common_vendor.index.request({
          url: `${BASE_URL}/devices`,
          method: "GET"
        });
        if (res.data.success) {
          this.deviceList = res.data.devices.map((device) => ({
            id: device.DtuNo,
            // 使用 DtuNo 字段
            name: device.DeviceName,
            // 使用 DeviceName 字段
            isOnline: false
            // 初始化为离线状态
          }));
          await this.updateDevicesOnlineStatus();
        } else {
          common_vendor.index.showToast({
            title: "获取设备列表失败",
            icon: "none"
          });
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:198", "获取设备列表失败:", e);
        common_vendor.index.showToast({
          title: "获取设备列表失败",
          icon: "none"
        });
      }
    },
    // 修改设备选择方法
    async onDeviceChange(e) {
      this.selectedIndex = e.detail.value;
      await this.getDeviceStatus();
    },
    startPolling() {
      if (this.deviceList.length === 0)
        return;
      this.updateDevicesOnlineStatus();
      this.getDeviceStatus();
      this.timer = setInterval(() => {
        this.updateDevicesOnlineStatus();
        this.getDeviceStatus();
      }, 1e3);
    },
    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    async getDeviceStatus() {
      try {
        const deviceId = this.deviceList[this.selectedIndex].id;
        const onlineRes = await common_vendor.index.request({
          url: `${BASE_URL}/online-dtus`,
          method: "GET"
        });
        if (onlineRes.data.success) {
          const onlineDevices = onlineRes.data.devices.map((device) => device.dtuNo);
          const isOnline = onlineDevices.includes(deviceId);
          this.deviceStatus.isOnline = isOnline;
          if (isOnline) {
            const statusRes = await common_vendor.index.request({
              url: `${BASE_URL}/dtu-status/${deviceId}`,
              method: "GET"
            });
            if (statusRes.data.success) {
              this.deviceStatus = {
                ...statusRes.data.data,
                isOnline
              };
            }
          } else {
            this.deviceStatus = {
              isOnline: false,
              dtuNo: deviceId,
              deviceName: this.deviceList[this.selectedIndex].name,
              rcvTime: "",
              voltageAB: "",
              voltageBC: "",
              voltageCA: "",
              currentA: "",
              currentB: "",
              currentC: "",
              energy: "",
              pressure: "",
              relayStatus: ""
            };
          }
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:280", "获取设备状态失败:", e);
        common_vendor.index.showToast({
          title: "获取设备状态失败",
          icon: "none"
        });
      }
    },
    async toggleRelay(status) {
      const deviceId = this.deviceList[this.selectedIndex].id;
      if (!this.deviceStatus.isOnline) {
        common_vendor.index.showToast({
          title: "设备离线，无法控制",
          icon: "none"
        });
        return;
      }
      try {
        this.stopPolling();
        const res = await common_vendor.index.request({
          url: `${BASE_URL}/control/relay`,
          method: "POST",
          data: {
            dtuNo: deviceId,
            command: status ? "ON" : "OFF"
          },
          header: {
            "content-type": "application/json"
          }
        });
        if (res.data.code === 0) {
          this.deviceStatus.relayStatus = status ? "闭合" : "断开";
          common_vendor.index.showToast({
            title: "操作成功",
            icon: "success"
          });
          setTimeout(() => {
            this.startPolling();
          }, 1e3);
        } else {
          this.startPolling();
          common_vendor.index.showToast({
            title: res.data.message || "控制失败",
            icon: "none"
          });
        }
      } catch (e) {
        this.startPolling();
        common_vendor.index.showToast({
          title: "控制失败",
          icon: "none"
        });
      }
    },
    // 添加新方法
    showDeviceList() {
      this.showPicker = true;
    },
    hidePicker() {
      this.showPicker = false;
    },
    async selectDevice(index) {
      this.selectedIndex = index;
      this.hidePicker();
      await this.getDeviceStatus();
    },
    // 修改在线状态更新方法
    async updateDevicesOnlineStatus() {
      if (this.deviceList.length === 0)
        return;
      try {
        const onlineRes = await common_vendor.index.request({
          url: `${BASE_URL}/online-dtus`,
          method: "GET"
        });
        if (onlineRes.data.success) {
          const onlineDevices = onlineRes.data.devices.map((device) => device.dtuNo);
          this.deviceList = this.deviceList.map((device) => ({
            ...device,
            isOnline: onlineDevices.includes(device.id)
          }));
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:379", "获取在线设备失败:", e);
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.deviceList[$data.selectedIndex].name),
    b: common_vendor.t($data.deviceList[$data.selectedIndex].isOnline ? "(在线)" : "(离线)"),
    c: common_vendor.n($data.deviceList[$data.selectedIndex].isOnline ? "device-online" : "device-offline"),
    d: common_vendor.o((...args) => $options.showDeviceList && $options.showDeviceList(...args)),
    e: $data.showPicker
  }, $data.showPicker ? {
    f: common_vendor.o((...args) => $options.hidePicker && $options.hidePicker(...args)),
    g: common_vendor.f($data.deviceList, (device, index, i0) => {
      return {
        a: common_vendor.t(device.name),
        b: common_vendor.t(device.isOnline ? "在线" : "离线"),
        c: device.id,
        d: common_vendor.n(device.isOnline ? "picker-item-online" : "picker-item-offline"),
        e: common_vendor.n($data.selectedIndex === index ? "picker-item-selected" : ""),
        f: common_vendor.o(($event) => $options.selectDevice(index), device.id)
      };
    }),
    h: common_vendor.o(() => {
    }),
    i: common_vendor.o((...args) => $options.hidePicker && $options.hidePicker(...args))
  } : {}, {
    j: $data.deviceList.length === 0
  }, $data.deviceList.length === 0 ? {} : {}, {
    k: common_vendor.t($data.deviceStatus.isOnline ? "在线" : "离线"),
    l: $data.deviceStatus.isOnline ? 1 : "",
    m: !$data.deviceStatus.isOnline ? 1 : "",
    n: common_vendor.t($options.formattedTime),
    o: common_vendor.t($data.deviceStatus.voltageAB || "--"),
    p: common_vendor.t($data.deviceStatus.voltageBC || "--"),
    q: common_vendor.t($data.deviceStatus.voltageCA || "--"),
    r: common_vendor.t($data.deviceStatus.currentA || "--"),
    s: common_vendor.t($data.deviceStatus.currentB || "--"),
    t: common_vendor.t($data.deviceStatus.currentC || "--"),
    v: common_vendor.t($data.deviceStatus.energy || "--"),
    w: common_vendor.t($data.deviceStatus.pressure || "--"),
    x: common_vendor.t($data.deviceStatus.relayStatus || "--"),
    y: common_vendor.n($data.deviceStatus.relayStatus === "闭合" ? "relay-on" : "relay-off"),
    z: $data.deviceStatus.relayStatus === "闭合",
    A: common_vendor.o((e) => $options.toggleRelay(e.detail.value)),
    B: !$data.deviceStatus.isOnline
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
