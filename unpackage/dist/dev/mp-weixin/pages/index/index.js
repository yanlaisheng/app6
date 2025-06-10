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
      onlineDevices: [],
      isRelayLoading: false,
      // 添加继电器状态加载标志
      localRelayStatus: ""
      // 添加本地继电器状态
    };
  },
  onLoad() {
    this.startPolling();
  },
  onUnload() {
    this.stopPolling();
  },
  watch: {
    // 监听deviceStatus中的继电器状态变化
    "deviceStatus.relayStatus": {
      immediate: true,
      handler(newVal) {
        if (!this.isRelayLoading) {
          this.localRelayStatus = newVal;
        }
      }
    }
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
      }, 2e3);
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
        if (this.isRelayLoading) {
          return;
        }
        const onlineRes = await common_vendor.index.request({
          url: "http://118.190.202.38:3000/api/online-dtus",
          method: "GET"
        });
        if (onlineRes.data.success) {
          const onlineDevices = onlineRes.data.devices.map((device) => device.dtuNo);
          const isOnline = onlineDevices.includes(deviceId);
          if (isOnline) {
            const statusRes = await common_vendor.index.request({
              url: `http://118.190.202.38:3000/api/dtu-status/${deviceId}`,
              method: "GET"
            });
            if (statusRes.data.success && !this.isRelayLoading) {
              this.deviceStatus = {
                ...statusRes.data.data,
                isOnline
              };
            }
          } else if (!this.isRelayLoading) {
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
        common_vendor.index.__f__("error", "at pages/index/index.vue:202", "获取设备状态失败:", e);
        if (!this.isRelayLoading) {
          common_vendor.index.showToast({
            title: "获取设备状态失败",
            icon: "none"
          });
        }
      }
    },
    async toggleRelay(e) {
      const status = e.detail.value;
      const deviceId = this.deviceList[this.selectedIndex].id;
      if (!this.deviceStatus.isOnline) {
        common_vendor.index.showToast({
          title: "设备离线，无法控制",
          icon: "none"
        });
        return;
      }
      this.isRelayLoading = true;
      this.stopPolling();
      const oldStatus = this.deviceStatus.relayStatus;
      try {
        this.deviceStatus.relayStatus = status ? "闭合" : "断开";
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
          common_vendor.index.showToast({
            title: "操作成功",
            icon: "success"
          });
          setTimeout(async () => {
            const statusRes = await common_vendor.index.request({
              url: `http://118.190.202.38:3000/api/dtu-status/${deviceId}`,
              method: "GET"
            });
            if (statusRes.data.success) {
              this.deviceStatus = {
                ...statusRes.data.data,
                isOnline: true
              };
            }
            this.isRelayLoading = false;
            this.startPolling();
          }, 1e3);
        } else {
          this.deviceStatus.relayStatus = oldStatus;
          this.isRelayLoading = false;
          this.startPolling();
          common_vendor.index.showToast({
            title: res.data.message || "控制失败",
            icon: "none"
          });
        }
      } catch (e2) {
        this.deviceStatus.relayStatus = oldStatus;
        this.isRelayLoading = false;
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
  return common_vendor.e({
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
    q: !$data.isRelayLoading
  }, !$data.isRelayLoading ? {
    r: common_vendor.t($data.deviceStatus.relayStatus || "--")
  } : {}, {
    s: $data.deviceStatus.relayStatus === "闭合",
    t: common_vendor.o((...args) => $options.toggleRelay && $options.toggleRelay(...args)),
    v: !$data.deviceStatus.isOnline || $data.isRelayLoading,
    w: !$data.deviceStatus.isOnline || $data.isRelayLoading ? 0.5 : 1
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
