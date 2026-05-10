/* 商务现代白主题 ECharts 图表配置 - 清新绿色系配色 */

const chartTheme = {
  // 颜色方案 - 绿色系
  color: ['#10B981', '#34D399', '#14B8A6', '#84CC16', '#059669', '#FBBF24'],

  // 背景色
  backgroundColor: 'transparent',

  // 标题样式
  title: {
    textStyle: {
      color: '#0F172A',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 16,
      fontWeight: 600
    },
    subtextStyle: {
      color: '#1E293B',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 12
    }
  },

  // 图例样式
  legend: {
    textStyle: {
      color: '#0F172A',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 12
    }
  },

  // 类目轴样式
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: '#E2E8F0'
      }
    },
    axisTick: {
      lineStyle: {
        color: '#E2E8F0'
      }
    },
    axisLabel: {
      color: '#1E293B',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 11,
      fontWeight: 500
    },
    splitLine: {
      lineStyle: {
        color: '#E2E8F0'
      }
    }
  },

  // 数值轴样式
  valueAxis: {
    axisLine: {
      lineStyle: {
        color: '#E2E8F0'
      }
    },
    axisTick: {
      lineStyle: {
        color: '#E2E8F0'
      }
    },
    axisLabel: {
      color: '#1E293B',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 11
    },
    splitLine: {
      lineStyle: {
        color: '#E2E8F0'
      }
    }
  },

  // 提示框样式
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#10B981',
    borderWidth: 1,
    textStyle: {
      color: '#0F172A',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 12
    }
  },

  // 时间轴样式
  timeline: {
    lineStyle: {
      color: '#E2E8F0'
    },
    itemStyle: {
      color: '#10B981'
    },
    label: {
      color: '#1E293B',
      fontFamily: 'Alibaba PuHuiTi, sans-serif'
    }
  }
};

// 柱状图默认配置
const barChartOption = {
  ...chartTheme,
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    ...chartTheme.categoryAxis
  },
  yAxis: {
    type: 'value',
    ...chartTheme.valueAxis
  },
  series: [{
    type: 'bar',
    barWidth: '55%',
    itemStyle: {
      borderRadius: [8, 8, 0, 0]
    },
    emphasis: {
      itemStyle: {
        color: '#34D399'
      }
    },
    label: {
      show: true,
      position: 'top',
      color: '#0F172A',
      fontSize: 13,
      fontWeight: 700
    },
    animationDuration: 1500,
    animationEasing: 'elasticOut'
  }]
};

// 折线图默认配置
const lineChartOption = {
  ...chartTheme,
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    ...chartTheme.categoryAxis
  },
  yAxis: {
    type: 'value',
    ...chartTheme.valueAxis
  },
  series: [{
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: {
      width: 3
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
          { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
        ]
      }
    },
    animationDuration: 1500,
    animationEasing: 'cubicOut'
  }]
};

// 饼图默认配置
const pieChartOption = {
  ...chartTheme,
  tooltip: {
    trigger: 'item',
    ...chartTheme.tooltip
  },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: true,
    itemStyle: {
      borderRadius: 8,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      show: true,
      color: '#0F172A',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 12
    },
    emphasis: {
      label: {
        show: true,
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    labelLine: {
      lineStyle: {
        color: '#E2E8F0'
      }
    },
    animationType: 'scale',
    animationEasing: 'elasticOut',
    animationDuration: 1000
  }]
};

// 雷达图默认配置
const radarChartOption = {
  ...chartTheme,
  radar: {
    indicator: [],
    axisName: {
      color: '#0F172A',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 11
    },
    splitArea: {
      areaStyle: {
        color: ['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.03)']
      }
    },
    axisLine: {
      lineStyle: {
        color: '#E2E8F0'
      }
    },
    splitLine: {
      lineStyle: {
        color: '#E2E8F0'
      }
    }
  },
  series: [{
    type: 'radar',
    areaStyle: {
      opacity: 0.3
    },
    lineStyle: {
      width: 2
    },
    animationDuration: 1000
  }]
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    chartTheme,
    barChartOption,
    lineChartOption,
    pieChartOption,
    radarChartOption
  };
}
