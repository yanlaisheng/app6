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
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$1 = {
    data() {
      return {
        deviceList: [
          { id: "13912345678", name: "DTU设备1" },
          { id: "13012345001", name: "DTU设备2" },
          { id: "13912345679", name: "DTU设备3" }
        ],
        selectedIndex: 0,
        deviceStatus: {
          isOnline: false,
          temperature: "--",
          humidity: "--"
        },
        relayStatus: [false, false, false, false],
        // 4路继电器状态
        timer: null
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
        this.timer = setInterval(() => {
          this.getDeviceStatus();
        }, 5e3);
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
          const res = await uni.request({
            url: "http://118.190.202.38:3000/api/dtu-status",
            data: { deviceId }
          });
          if (res.data.code === 0) {
            this.deviceStatus = res.data.data;
          }
        } catch (e) {
          uni.showToast({
            title: "获取设备状态失败",
            icon: "none"
          });
        }
      },
      async toggleRelay(index, status) {
        try {
          const deviceId = this.deviceList[this.selectedIndex].id;
          const res = await uni.request({
            url: "http://118.190.202.38:3000/api/control/relay",
            method: "POST",
            data: {
              deviceId,
              relayIndex: index,
              status
            }
          });
          if (res.data.code === 0) {
            this.relayStatus[index] = status;
            uni.showToast({
              title: "操作成功",
              icon: "success"
            });
          }
        } catch (e) {
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
          vue.createElementVNode(
            "view",
            { class: "picker" },
            " 当前设备: " + vue.toDisplayString($data.deviceList[$data.selectedIndex].name),
            1
            /* TEXT */
          )
        ], 40, ["value", "range"])
      ]),
      vue.createCommentVNode(" 设备状态显示区 "),
      vue.createElementVNode("view", { class: "status-panel" }, [
        vue.createElementVNode("view", { class: "status-item" }, [
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
        vue.createElementVNode("view", { class: "status-item" }, [
          vue.createElementVNode("text", null, "电压:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.temperature) + "V",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "status-item" }, [
          vue.createElementVNode("text", null, "电流:"),
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.deviceStatus.humidity) + "A",
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createCommentVNode(" 继电器控制区 "),
      vue.createElementVNode("view", { class: "control-panel" }, [
        vue.createElementVNode("view", { class: "relay-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.relayStatus, (relay, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: index,
                class: "relay-item"
              }, [
                vue.createElementVNode(
                  "text",
                  null,
                  "继电器" + vue.toDisplayString(index + 1),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("switch", {
                  checked: relay,
                  onChange: (e) => $options.toggleRelay(index, e.detail.value)
                }, null, 40, ["checked", "onChange"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "G:/桌面/app6/pages/index/index.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
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
