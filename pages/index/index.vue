<template>
    <view class="container">
        <!-- 设备选择区 -->
        <view class="device-select">
            <picker @change="onDeviceChange" :value="selectedIndex" :range="deviceList" range-key="name">
                <view class="picker-button">
                    <text class="device-label">当前设备:</text>
                    <text class="device-name">{{deviceList[selectedIndex].name}}</text>
                    <text class="picker-arrow">▼</text>
                </view>
            </picker>
        </view>
        
        <!-- 设备状态显示区 -->
        <view class="status-panel">
            <view class="status-item status-connection">
                <text>设备状态:</text>
                <text :class="{'online': deviceStatus.isOnline, 'offline': !deviceStatus.isOnline}">
                    {{deviceStatus.isOnline ? '在线' : '离线'}}
                </text>
            </view>
            <view class="status-item status-time">
                <text>更新时间:</text>
                <text>{{formattedTime}}</text>
            </view>
            <view class="status-item voltage">
                <text>AB线电压:</text>
                <text>{{deviceStatus.voltageAB || '--'}} V</text>
            </view>
            <view class="status-item voltage">
                <text>BC线电压:</text>
                <text>{{deviceStatus.voltageBC || '--'}} V</text>
            </view>
            <view class="status-item voltage">
                <text>CA线电压:</text>
                <text>{{deviceStatus.voltageCA || '--'}} V</text>
            </view>
            <view class="status-item current">
                <text>A相电流:</text>
                <text>{{deviceStatus.currentA || '--'}} A</text>
            </view>
            <view class="status-item current">
                <text>B相电流:</text>
                <text>{{deviceStatus.currentB || '--'}} A</text>
            </view>
            <view class="status-item current">
                <text>C相电流:</text>
                <text>{{deviceStatus.currentC || '--'}} A</text>
            </view>
            <view class="status-item energy">
                <text>用电量:</text>
                <text>{{deviceStatus.energy || '--'}} kWh</text>
            </view>
            <view class="status-item pressure">
                <text>压力:</text>
                <text>{{deviceStatus.pressure || '--'}} MPa</text>
            </view>
        </view>
        
        <!-- 继电器控制区 -->
        <view class="control-panel">
            <view class="relay-item">
                <view class="relay-status">
                    <text class="relay-label">继电器状态:</text>
                    <text :class="[
                        'relay-value',
                        deviceStatus.relayStatus === '闭合' ? 'relay-on' : 'relay-off'
                    ]">
                        {{deviceStatus.relayStatus || '--'}}
                    </text>
                </view>
                <switch 
                    :checked="deviceStatus.relayStatus === '闭合'" 
                    @change="(e) => toggleRelay(e.detail.value)"
                    :disabled="!deviceStatus.isOnline"
                    class="relay-switch"
                />
            </view>
        </view>
    </view>
</template>

<script>
// 添加基础URL配置
const BASE_URL = 'https://monitor.sanli.cn:3000/api'

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
    computed: {
        formattedTime() {
            if (!this.deviceStatus.rcvTime) return '--'
            const date = new Date(this.deviceStatus.rcvTime)
            // 使用 padStart 补0
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            const seconds = String(date.getSeconds()).padStart(2, '0')
            
            return `${date.getFullYear()}/${month}/${day} ${hours}:${minutes}:${seconds}`
        }
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
                
                // 修改在线状态请求地址
                const onlineRes = await uni.request({
                    url: `${BASE_URL}/online-dtus`,
                    method: 'GET'
                })
                
                if(onlineRes.data.success) {
                    const onlineDevices = onlineRes.data.devices.map(device => device.dtuNo)
                    const isOnline = onlineDevices.includes(deviceId)
                    this.deviceStatus.isOnline = isOnline
                    
                    // 如果设备在线，则获取详细状态
                    if(isOnline) {
                        // 修改设备状态请求地址
                        const statusRes = await uni.request({
                            url: `${BASE_URL}/dtu-status/${deviceId}`,
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

                // 修改继电器控制请求地址
                const res = await uni.request({
                    url: `${BASE_URL}/control/relay`,
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
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);  /* 改用更柔和的渐变 */
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);  /* 更轻柔的阴影 */
}

.picker-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #ffffff;
    padding: 10px 15px;
    border-radius: 4px;
    border: 1px solid #e0e0e0;  /* 添加细边框 */
}

.device-label {
    color: #666;  /* 更柔和的文字颜色 */
    font-size: 14px;
}

.device-name {
    color: #333;  /* 更深的文字颜色 */
    font-size: 15px;
    font-weight: 500;  /* 减小字体粗细 */
    margin: 0 10px;
    flex: 1;
    text-align: center;
}

.picker-arrow {
    color: #999;  /* 更柔和的箭头颜色 */
    font-size: 12px;
}

.status-panel {
    background: #ffffff;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid #f0f0f0;
}

.status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    margin-bottom: 8px;
    border-radius: 6px;
    background: #f8f9fa;
    transition: all 0.3s ease;
}

.status-item:hover {
    background: #f0f2f5;
}

.status-item text:first-child {
    color: #666;
    font-size: 14px;
}

.status-item text:last-child {
    color: #333;
    font-size: 15px;
    font-weight: 500;
}

.online {
    color: #52c41a !important;
    font-weight: 600;
}

.offline {
    color: #ff4d4f !important;
    font-weight: 600;
}

/* 为不同类型的数据添加不同的颜色 */
.status-item.voltage text:last-child {
    color: #1890ff;
}

.status-item.current text:last-child {
    color: #722ed1;
}

.status-item.energy text:last-child {
    color: #13c2c2;
}

.status-item.pressure text:last-child {
    color: #fa8c16;
}

.control-panel {
    background: #ffffff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid #f0f0f0;
}

.relay-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    transition: all 0.3s ease;
}

.relay-item:hover {
    background: #f0f2f5;
}

.relay-status {
    display: flex;
    align-items: center;
    gap: 10px;
}

.relay-label {
    color: #666;
    font-size: 14px;
}

.relay-value {
    font-size: 15px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 4px;
    background: #f0f0f0;
}

.relay-on {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.1);
}

.relay-off {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
}

.relay-switch {
    transform: scale(0.9);
}

/* 禁用状态的样式 */
.relay-switch[disabled] {
    opacity: 0.6;
}
</style>
