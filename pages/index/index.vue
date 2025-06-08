<template>
    <view class="container">
        <!-- 设备选择区 -->
        <view class="device-select">
            <picker @change="onDeviceChange" :value="selectedIndex" :range="deviceList" range-key="name">
                <view class="picker">
                    当前设备: {{deviceList[selectedIndex].name}}
                </view>
            </picker>
        </view>
        
        <!-- 设备状态显示区 -->
        <view class="status-panel">
            <view class="status-item">
                <text>设备状态:</text>
                <text :class="{'online': deviceStatus.isOnline, 'offline': !deviceStatus.isOnline}">
                    {{deviceStatus.isOnline ? '在线' : '离线'}}
                </text>
            </view>
            <view class="status-item">
                <text>电压:</text>
                <text>{{deviceStatus.temperature}}V</text>
            </view>
            <view class="status-item">
                <text>电流:</text>
                <text>{{deviceStatus.humidity}}A</text>
            </view>
        </view>
        
        <!-- 继电器控制区 -->
        <view class="control-panel">
            <view class="relay-list">
                <view v-for="(relay, index) in relayStatus" :key="index" class="relay-item">
                    <text>继电器{{index + 1}}</text>
                    <switch :checked="relay" @change="(e) => toggleRelay(index, e.detail.value)" />
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            deviceList: [
                { id: '13912345678', name: 'DTU设备1' },
                { id: '13012345001', name: 'DTU设备2' },
				{ id: '13912345679', name: 'DTU设备3' }
            ],
            selectedIndex: 0,
            deviceStatus: {
                isOnline: false,
                temperature: '--',
                humidity: '--'
            },
            relayStatus: [false, false, false, false], // 4路继电器状态
            timer: null,
            onlineDevices: [] // 添加在线设备列表
        }
    },
    onLoad() {
        // 页面加载时开始轮询设备状态
        this.startPolling()
    },
    onUnload() {
        // 页面卸载时清除轮询
        this.stopPolling()
    },
    methods: {
        onDeviceChange(e) {
            this.selectedIndex = e.detail.value
            // 切换设备后重新获取状态
            this.getDeviceStatus()
        },
        async getOnlineDevices() {
            try {
                const res = await uni.request({
                    url: 'http://118.190.202.38:3000/api/online-dtus',
                    method: 'GET'
                })
                
                if(res.data.success) {
                    this.onlineDevices = res.data.devices.map(device => device.dtuNo)
                    // 更新当前设备的在线状态
                    const currentDeviceId = this.deviceList[this.selectedIndex].id
                    this.deviceStatus.isOnline = this.onlineDevices.includes(currentDeviceId)
                }
            } catch(e) {
                console.error('获取在线设备失败:', e)
            }
        },
        startPolling() {
            // 立即执行一次
            this.getOnlineDevices()
            this.getDeviceStatus()
            
            // 每5秒轮询一次
            this.timer = setInterval(() => {
                this.getOnlineDevices()
                this.getDeviceStatus()
            }, 5000)
        },
        stopPolling() {
            if(this.timer) {
                clearInterval(this.timer)
                this.timer = null
            }
        },
        async getDeviceStatus() {
            try {
                const deviceId = this.deviceList[this.selectedIndex].id
                const res = await uni.request({
                    url: `http://118.190.202.38:3000/api/dtu-status/${deviceId}`,
                    method: 'GET'
                })
                
                if(res.data.code === 0) {
                    // 更新设备数据，但保持在线状态
                    const isOnline = this.onlineDevices.includes(deviceId)
                    this.deviceStatus = {
                        ...res.data.data,
                        isOnline
                    }
                } else {
                    uni.showToast({
                        title: res.data.message || '获取设备状态失败',
                        icon: 'none'
                    })
                }
            } catch(e) {
                uni.showToast({
                    title: '获取设备状态失败',
                    icon: 'none'
                })
            }
        },
        async toggleRelay(index, status) {
            const deviceId = this.deviceList[this.selectedIndex].id
            
            // 判断设备是否在线
            if (!this.onlineDevices.includes(deviceId)) {
                uni.showToast({
                    title: '设备离线，无法控制',
                    icon: 'none'
                })
                return
            }

            try {
                const res = await uni.request({
                    url: 'http://118.190.202.38:3000/api/control/relay',
                    method: 'POST',
                    data: {
                        dtuNo: deviceId,
                        command: status ? 'ON' : 'OFF'
                    },
                    header: {
                        'content-type': 'application/json'
                    }
                })
                
                if(res.data.code === 0) {
                    this.relayStatus[index] = status
                    uni.showToast({
                        title: '操作成功',
                        icon: 'success'
                    })
                } else {
                    uni.showToast({
                        title: res.data.message || '控制失败',
                        icon: 'none'
                    })
                }
            } catch(e) {
                uni.showToast({
                    title: '控制失败',
                    icon: 'none'
                })
            }
        }
    }
}
</script>

<style>
.container {
    padding: 20px;
}

.device-select {
    background-color: #fff;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.status-panel {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.status-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
}

.online {
    color: #4cd964;
}

.offline {
    color: #dd524d;
}

.control-panel {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
}

.relay-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
}

.relay-item:last-child {
    border-bottom: none;
}
</style>
