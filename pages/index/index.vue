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
                <text>继电器状态: {{deviceStatus.relayStatus || '--'}}</text>
                <switch :checked="deviceStatus.relayStatus === '闭合'" 
                        @change="(e) => toggleRelay(e.detail.value)" />
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
            onlineDevices: []
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
            // 切换设备后立即获取新设备的状态
            this.getDeviceStatus()
        },

        startPolling() {
            // 立即执行一次当前设备状态查询
            this.getDeviceStatus()
            
            // 将轮询间隔从5秒改为1秒
            this.timer = setInterval(() => {
                this.getDeviceStatus()
            }, 1000)  // 改为1000毫秒
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
                
                // 先获取设备在线状态
                const onlineRes = await uni.request({
                    url: 'http://118.190.202.38:3000/api/online-dtus',
                    method: 'GET'
                })
                
                if(onlineRes.data.success) {
                    const onlineDevices = onlineRes.data.devices.map(device => device.dtuNo)
                    const isOnline = onlineDevices.includes(deviceId)
                    this.deviceStatus.isOnline = isOnline
                    
                    // 如果设备在线，则获取详细状态
                    if(isOnline) {
                        const statusRes = await uni.request({
                            url: `http://118.190.202.38:3000/api/dtu-status/${deviceId}`,
                            method: 'GET'
                        })
                        
                        if(statusRes.data.success) {
                            this.deviceStatus = {
                                ...statusRes.data.data,
                                isOnline
                            }
                        }
                    } else {
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
                uni.showToast({
                    title: '获取设备状态失败',
                    icon: 'none'
                })
            }
        },
        async toggleRelay(status) {
            const deviceId = this.deviceList[this.selectedIndex].id
            
            if (!this.deviceStatus.isOnline) {
                uni.showToast({
                    title: '设备离线，无法控制',
                    icon: 'none'
                })
                return
            }

            try {
                // 发送控制命令前先停止轮询
                this.stopPolling()

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
                    // 控制成功后立即更新UI显示
                    this.deviceStatus.relayStatus = status ? '闭合' : '断开'
                    
                    uni.showToast({
                        title: '操作成功',
                        icon: 'success'
                    })
                    
                    // 延迟时间也相应缩短
                    setTimeout(() => {
                        this.startPolling()
                    }, 1000)  // 改为1000毫秒
                } else {
                    // 控制失败时立即恢复轮询
                    this.startPolling()
                    uni.showToast({
                        title: res.data.message || '控制失败',
                        icon: 'none'
                    })
                }
            } catch(e) {
                // 发生错误时立即恢复轮询
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
</style>
