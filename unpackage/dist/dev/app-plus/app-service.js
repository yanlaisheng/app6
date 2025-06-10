if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const BASE_URL = "https://monitor.sanli.cn:3000/api";
  const _sfc_main$1 = {
    data() {
      return {
        deviceList: [
          { id: "13012345005", name: "DTU设备1", isOnline: false },
          { id: "13012345001", name: "DTU设备2", isOnline: false },
          { id: "13912345678", name: "DTU设备3", isOnline: false },
          { id: "13912345679", name: "DTU设备4", isOnline: false }
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
      async updateDevicesOnlineStatus() {
        try {
          const onlineRes = await uni.request({
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
          formatAppLog("error", "at pages/index/index.vue:161", "获取在线设备失败:", e);
        }
      },
      // 修改设备选择方法
      async onDeviceChange(e) {
        this.selectedIndex = e.detail.value;
        await this.getDeviceStatus();
      },
      startPolling() {
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
          const onlineRes = await uni.request({
            url: `${BASE_URL}/online-dtus`,
            method: "GET"
          });
          if (onlineRes.data.success) {
            const onlineDevices = onlineRes.data.devices.map((device) => device.dtuNo);
            const isOnline = onlineDevices.includes(deviceId);
            this.deviceStatus.isOnline = isOnline;
            if (isOnline) {
              const statusRes = await uni.request({
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
          formatAppLog("error", "at pages/index/index.vue:237", "获取设备状态失败:", e);
          uni.showToast({
            title: "获取设备状态失败",
            icon: "none"
          });
        }
      },
      async toggleRelay(status) {
        const deviceId = this.deviceList[this.selectedIndex].id;
        if (!this.deviceStatus.isOnline) {
          uni.showToast({
            title: "设备离线，无法控制",
            icon: "none"
          });
          return;
        }
        try {
          this.stopPolling();
          const res = await uni.request({
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
            uni.showToast({
              title: "操作成功",
              icon: "success"
            });
            setTimeout(() => {
              this.startPolling();
            }, 1e3);
          } else {
            this.startPolling();
            uni.showToast({
              title: res.data.message || "控制失败",
              icon: "none"
            });
          }
        } catch (e) {
          this.startPolling();
          uni.showToast({
            title: "控制失败",
            icon: "none"
          });
        }
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 设备选择区 "),
      vue.createElementVNode("view", { class: "device-select" }, [
        vue.createElementVNode("picker", {
          onChange: _cache[0] || (_cache[0] = (...args) => $options.onDeviceChange && $options.onDeviceChange(...args)),
          value: $data.selectedIndex,
          range: $data.deviceList,
          "range-key": "name"
        }, [
          vue.createElementVNode("view", { class: "picker-button" }, [
            vue.createElementVNode("text", { class: "device-label" }, "当前设备:"),
            vue.createElementVNode(
              "text",
              {
                class: vue.normalizeClass([
                  "device-name",
                  $data.deviceList[$data.selectedIndex].isOnline ? "device-online" : "device-offline"
                ])
              },
              [
                vue.createTextVNode(
                  vue.toDisplayString($data.deviceList[$data.selectedIndex].name) + " ",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "device-status" },
                  vue.toDisplayString($data.deviceList[$data.selectedIndex].isOnline ? "(在线)" : "(离线)"),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode("text", { class: "picker-arrow" }, "▼")
          ])
        ], 40, ["value", "range"])
      ]),
      vue.createCommentVNode(" 设备状态显示区 "),
      vue.createElementVNode("view", { class: "status-panel" }, [
        vue.createElementVNode("view", { class: "status-item status-connection" }, [
          vue.createElementVNode("text", null, "设备状态:"),
          vue.createElementVNode(
            "text",
            {
              class: vue.normalizeClass({ "online": $data.deviceStatus.isOnline, "offline": !$data.deviceStatus.isOnline })
            },
            vue.toDisplayString($data.deviceStatus.isOnline ? "在线" : "离线"),
            3
            /* TEXT, CLASS */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item status-time" }, [
          vue.createElementVNode("text", null, "更新时间:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($options.formattedTime),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item voltage" }, [
          vue.createElementVNode("text", null, "AB线电压:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.voltageAB || "--") + " V",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item voltage" }, [
          vue.createElementVNode("text", null, "BC线电压:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.voltageBC || "--") + " V",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item voltage" }, [
          vue.createElementVNode("text", null, "CA线电压:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.voltageCA || "--") + " V",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item current" }, [
          vue.createElementVNode("text", null, "A相电流:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.currentA || "--") + " A",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item current" }, [
          vue.createElementVNode("text", null, "B相电流:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.currentB || "--") + " A",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item current" }, [
          vue.createElementVNode("text", null, "C相电流:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.currentC || "--") + " A",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item energy" }, [
          vue.createElementVNode("text", null, "用电量:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.energy || "--") + " kWh",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item pressure" }, [
          vue.createElementVNode("text", null, "压力:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.pressure || "--") + " MPa",
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createCommentVNode(" 继电器控制区 "),
      vue.createElementVNode("view", { class: "control-panel" }, [
        vue.createElementVNode("view", { class: "relay-item" }, [
          vue.createElementVNode("view", { class: "relay-status" }, [
            vue.createElementVNode("text", { class: "relay-label" }, "继电器状态:"),
            vue.createElementVNode(
              "text",
              {
                class: vue.normalizeClass([
                  "relay-value",
                  $data.deviceStatus.relayStatus === "闭合" ? "relay-on" : "relay-off"
                ])
              },
              vue.toDisplayString($data.deviceStatus.relayStatus || "--"),
              3
              /* TEXT, CLASS */
            )
          ]),
          vue.createElementVNode("switch", {
            checked: $data.deviceStatus.relayStatus === "闭合",
            onChange: _cache[1] || (_cache[1] = (e) => $options.toggleRelay(e.detail.value)),
            disabled: !$data.deviceStatus.isOnline,
            class: "relay-switch"
          }, null, 40, ["checked", "disabled"])
        ])
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "G:/桌面/app6/pages/index/index.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "G:/桌面/app6/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
