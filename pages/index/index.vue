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
                <text>更新时间:</text>
                <text>{{deviceStatus.rcvTime || '--'}}</text>
            </view>
            <view class="status-item">
                <text>AB线电压:</text>
                <text>{{deviceStatus.voltageAB || '--'}} V</text>
            </view>
            <view class="status-item">
                <text>BC线电压:</text>
                <text>{{deviceStatus.voltageBC || '--'}} V</text>
            </view>
            <view class="status-item">
                <text>CA线电压:</text>
                <text>{{deviceStatus.voltageCA || '--'}} V</text>
            </view>
            <view class="status-item">
                <text>A相电流:</text>
                <text>{{deviceStatus.currentA || '--'}} A</text>
            </view>
            <view class="status-item">
                <text>B相电流:</text>
                <text>{{deviceStatus.currentB || '--'}} A</text>
            </view>
            <view class="status-item">
                <text>C相电流:</text>
                <text>{{deviceStatus.currentC || '--'}} A</text>
            </view>
            <view class="status-item">
                <text>用电量:</text>
                <text>{{deviceStatus.energy || '--'}} kWh</text>
            </view>
            <view class="status-item">
                <text>压力:</text>
                <text>{{deviceStatus.pressure || '--'}} MPa</text>
            </view>
        </view>
        
        <!-- 继电器控制区 -->
        <view class="control-panel">
            <view class="relay-item">
                <view class="relay-status">
                    <text>继电器状态: </text>
                    <text v-if="!isRelayLoading">
                        {{deviceStatus.relayStatus || '--'}}
                    </text>
                    <view v-else class="loading-icon"></view>
                </view>
                <switch 
                    :checked="deviceStatus.relayStatus === '闭合'"
                    @change="toggleRelay"
                    :disabled="!deviceStatus.isOnline || isRelayLoading"
                    :style="{ opacity: (!deviceStatus.isOnline || isRelayLoading) ? 0.5 : 1 }"
                />
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            deviceList: [
                { id: '13012345005', name: 'DTU设备1' },
                { id: '13012345001', name: 'DTU设备2' },
                { id: '13912345678', name: 'DTU设备3' },
                { id: '13912345679', name: 'DTU设备4' }
            ],
            selectedIndex: 0,
            deviceStatus: {
                isOnline: false,
                dtuNo: '',
                deviceName: '',
                rcvTime: '',
                voltageAB: '',
                voltageBC: '',
                voltageCA: '',
                currentA: '',
                currentB: '',
                currentC: '',
                energy: '',
                pressure: '',
                relayStatus: ''
            },
            timer: null,
            onlineDevices: [],
            isRelayLoading: false, // 添加继电器状态加载标志
            localRelayStatus: '' // 添加本地继电器状态
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
    watch: {
        // 监听deviceStatus中的继电器状态变化
        'deviceStatus.relayStatus': {
            immediate: true,
            handler(newVal) {
                if (!this.isRelayLoading) {
                    this.localRelayStatus = newVal
                }
            }
        }
    },
    methods: {
        onDeviceChange(e) {
            this.selectedIndex = e.detail.value
            // 切换设备后立即获取新设备的状态
            this.getDeviceStatus()
        },

        startPolling() {
            this.getDeviceStatus()
            this.timer = setInterval(() => {
                this.getDeviceStatus()
            }, 2000)  // 改为2000毫秒
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
                
                // 如果正在控制继电器，则不更新状态显示
                if (this.isRelayLoading) {
                    return;
                }

                // 先获取设备在线状态
                const onlineRes = await uni.request({
                    url: 'http://118.190.202.38:3000/api/online-dtus',
                    method: 'GET'
                })
                
                if(onlineRes.data.success) {
                    const onlineDevices = onlineRes.data.devices.map(device => device.dtuNo)
                    const isOnline = onlineDevices.includes(deviceId)
                    
                    // 如果设备在线，则获取详细状态
                    if(isOnline) {
                        const statusRes = await uni.request({
                            url: `http://118.190.202.38:3000/api/dtu-status/${deviceId}`,
                            method: 'GET'
                        })
                        
                        if(statusRes.data.success && !this.isRelayLoading) {
                            this.deviceStatus = {
                                ...statusRes.data.data,
                                isOnline
                            }
                        }
                    } else if (!this.isRelayLoading) {
                        // 如果设备离线，清空状态数据
                        this.deviceStatus = {
                            isOnline: false,
                            dtuNo: deviceId,
                            deviceName: this.deviceList[this.selectedIndex].name,
                            rcvTime: '',
                            voltageAB: '',
                            voltageBC: '',
                            voltageCA: '',
                            currentA: '',
                            currentB: '',
                            currentC: '',
                            energy: '',
                            pressure: '',
                            relayStatus: ''
                        }
                    }
                }
            } catch(e) {
                console.error('获取设备状态失败:', e)
                if (!this.isRelayLoading) {
                    uni.showToast({
                        title: '获取设备状态失败',
                        icon: 'none'
                    })
                }
            }
        },
        async toggleRelay(e) {
            const status = e.detail.value
            const deviceId = this.deviceList[this.selectedIndex].id
            
            if (!this.deviceStatus.isOnline) {
                uni.showToast({
                    title: '设备离线，无法控制',
                    icon: 'none'
                })
                return
            }

            // 设置加载状态
            this.isRelayLoading = true
            // 停止轮询
            this.stopPolling()
            
            // 保存旧状态以便恢复
            const oldStatus = this.deviceStatus.relayStatus

            try {
                // 立即更新状态，实现即时响应
                this.deviceStatus.relayStatus = status ? '闭合' : '断开'

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
                    uni.showToast({
                        title: '操作成功',
                        icon: 'success'
                    })

                    // 延迟查询实际状态
                    setTimeout(async () => {
                        const statusRes = await uni.request({
                            url: `http://118.190.202.38:3000/api/dtu-status/${deviceId}`,
                            method: 'GET'
                        })
                        
                        if(statusRes.data.success) {
                            this.deviceStatus = {
                                ...statusRes.data.data,
                                isOnline: true
                            }
                        }
                        
                        // 最后才关闭加载状态并恢复轮询
                        this.isRelayLoading = false
                        this.startPolling()
                    }, 1000)
                } else {
                    // 控制失败时恢复旧状态
                    this.deviceStatus.relayStatus = oldStatus
                    this.isRelayLoading = false
                    this.startPolling()
                    uni.showToast({
                        title: res.data.message || '控制失败',
                        icon: 'none'
                    })
                }
            } catch(e) {
                // 发生错误时恢复旧状态
                this.deviceStatus.relayStatus = oldStatus
                this.isRelayLoading = false
                this.startPolling()
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
    font-size: 14px;
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
}

.relay-status {
    display: flex;
    align-items: center;
}

.loading-icon {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007AFF;  /* 使用uni-app主题蓝色 */
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-left: 10px;
    vertical-align: middle;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
