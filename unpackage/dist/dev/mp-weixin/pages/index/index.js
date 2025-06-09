"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      deviceList: [
        { id: "13012345005", name: "DTU设备1" },
        { id: "13012345001", name: "DTU设备2" },
        { id: "13912345678", name: "DTU设备3" },
        { id: "13912345679", name: "DTU设备4" }
      ],
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
      onlineDevices: []
    };
  },
  onLoad() {
    this.startPolling();
  },
  onUnload() {
    this.stopPolling();
  },
  methods: {
    onDeviceChange(e) {
      this.selectedIndex = e.detail.value;
      this.getDeviceStatus();
    },
    startPolling() {
      this.getDeviceStatus();
      this.timer = setInterval(() => {
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
          url: "http://118.190.202.38:3000/api/online-dtus",
          method: "GET"
        });
        if (onlineRes.data.success) {
          const onlineDevices = onlineRes.data.devices.map((device) => device.dtuNo);
          const isOnline = onlineDevices.includes(deviceId);
          this.deviceStatus.isOnline = isOnline;
          if (isOnline) {
            const statusRes = await common_vendor.index.request({
              url: `http://118.190.202.38:3000/api/dtu-status/${deviceId}`,
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
        common_vendor.index.__f__("error", "at pages/index/index.vue:178", "获取设备状态失败:", e);
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
          url: "http://118.190.202.38:3000/api/control/relay",
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
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.deviceList[$data.selectedIndex].name),
    b: common_vendor.o((...args) => $options.onDeviceChange && $options.onDeviceChange(...args)),
    c: $data.selectedIndex,
    d: $data.deviceList,
    e: common_vendor.t($data.deviceStatus.isOnline ? "在线" : "离线"),
    f: $data.deviceStatus.isOnline ? 1 : "",
    g: !$data.deviceStatus.isOnline ? 1 : "",
    h: common_vendor.t($data.deviceStatus.rcvTime || "--"),
    i: common_vendor.t($data.deviceStatus.voltageAB || "--"),
    j: common_vendor.t($data.deviceStatus.voltageBC || "--"),
    k: common_vendor.t($data.deviceStatus.voltageCA || "--"),
    l: common_vendor.t($data.deviceStatus.currentA || "--"),
    m: common_vendor.t($data.deviceStatus.currentB || "--"),
    n: common_vendor.t($data.deviceStatus.currentC || "--"),
    o: common_vendor.t($data.deviceStatus.energy || "--"),
    p: common_vendor.t($data.deviceStatus.pressure || "--"),
    q: common_vendor.t($data.deviceStatus.relayStatus || "--"),
    r: $data.deviceStatus.relayStatus === "闭合",
    s: common_vendor.o((e) => $options.toggleRelay(e.detail.value))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
