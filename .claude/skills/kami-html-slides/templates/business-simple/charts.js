/* 文青白主题 ECharts 图表配置 */

const chartTheme = {
  // 颜色方案
  color: ['#272343', '#2d334a', '#bae8e8', '#e3f6f5', '#687a8a'],

  // 背景色
  backgroundColor: 'transparent',

  // 标题样式
  title: {
    textStyle: {
      color: '#272343',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 16,
      fontWeight: 600
    },
    subtextStyle: {
      color: '#2d334a',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 12
    }
  },

  // 图例样式
  legend: {
    textStyle: {
      color: '#272343',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 12
    }
  },

  // 类目轴样式
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: '#bae8e8'
      }
    },
    axisTick: {
      lineStyle: {
        color: '#bae8e8'
      }
    },
    axisLabel: {
      color: '#2d334a',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 11
    },
    splitLine: {
      lineStyle: {
        color: '#e3f6f5'
      }
    }
  },

  // 数值轴样式
  valueAxis: {
    axisLine: {
      lineStyle: {
        color: '#bae8e8'
      }
    },
    axisTick: {
      lineStyle: {
        color: '#bae8e8'
      }
    },
    axisLabel: {
      color: '#2d334a',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 11
    },
    splitLine: {
      lineStyle: {
        color: '#e3f6f5'
      }
    }
  },

  // 提示框样式
  tooltip: {
    backgroundColor: 'rgba(255, 255, 254, 0.95)',
    borderColor: '#bae8e8',
    borderWidth: 1,
    textStyle: {
      color: '#272343',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 12
    }
  },

  // 时间轴样式
  timeline: {
    lineStyle: {
      color: '#bae8e8'
    },
    itemStyle: {
      color: '#272343'
    },
    label: {
      color: '#2d334a',
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
    barWidth: '40%',
    itemStyle: {
      borderRadius: [4, 4, 0, 0]
    },
    emphasis: {
      itemStyle: {
        color: '#2d334a'
      }
    },
    animationDuration: 1000,
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
          { offset: 0, color: 'rgba(186, 232, 232, 0.5)' },
          { offset: 1, color: 'rgba(186, 232, 232, 0.1)' }
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
      color: '#272343',
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
        color: '#bae8e8'
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
      color: '#272343',
      fontFamily: 'Alibaba PuHuiTi, sans-serif',
      fontSize: 11
    },
    splitArea: {
      areaStyle: {
        color: ['rgba(227, 246, 245, 0.3)', 'rgba(227, 246, 245, 0.1)']
      }
    },
    axisLine: {
      lineStyle: {
        color: '#bae8e8'
      }
    },
    splitLine: {
      lineStyle: {
        color: '#bae8e8'
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