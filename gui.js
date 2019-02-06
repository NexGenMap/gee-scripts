Map.style().set('cursor', 'hand');

var panel = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style:{
      width: '320px',
      position: 'top-right',
      border: '0.5px solid #000000CC',
      backgroundColor: '#A3CCFFA0' 
    }
});
/*
ui.Panel({
  widgets: [buttonExport, buttonVisualize],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {
    position: 'top-center',
    backgroundColor: '#A3CCFF90',
  }
})
*/
var Header = ui.Label('NextGenMap - Mosaics', { fontWeight: 'bold', fontSize: '20px', textAlign: 'center', backgroundColor: '#A3CCFF00' });
var label_grid_select = ui.Label('Select grid', { fontWeight: 'bold', backgroundColor: '#A3CCFF00' });
var grid_select = ui.Select({
    items: [
      { label: 'SA-23-V-D', value: 'SA-23-V-D' },
      { label: 'SA-23-Y-C', value: 'SA-23-Y-C' },
      { label: 'SB-21-Y-C', value: 'SB-21-Y-C' },    
      { label: 'SB-24-Z-D', value: 'SB-24-Z-D' },
      { label: 'SC-21-Z-C', value: 'SC-21-Z-C' },    
      { label: 'SC-24-V-D', value: 'SC-24-V-D' },    
      { label: 'SD-22-Z-C', value: 'SD-22-Z-C' },
      { label: 'SD-23-Y-C', value: 'SD-23-Y-C' },
      { label: 'SE-21-Z-A', value: 'SE-21-Z-A' },
      { label: 'SF-23-Z-B', value: 'SF-23-Z-B' },
      { label: 'SF-23-X-B', value: 'SF-23-X-B' },
      { label: 'SF-20-Z-D', value: 'SF-20-Z-D' },
      { label: 'SF-23-Y-C', value: 'SF-23-Y-C' },
      { label: 'SG-20-V-B', value: 'SG-20-V-B' },
      { label: 'SH-21-Z-B', value: 'SH-21-Z-B' },
      { label: 'SH-22-Y-D', value: 'SH-22-Y-D' },
    ],
    value: 'SF-23-Z-B',
    style: { width: '240px' }
});


var label_year_select = ui.Label('Select year', { fontWeight: 'bold', backgroundColor: '#A3CCFF00' });
var year_select = ui.Select({
    items: [
        { label: '2017', value: 2017 },
        { label: '2018', value: 2018},
    ],
    value: 2017,
    style: { width: '240px' }
});

var label_month_select = ui.Label('Select month', { fontWeight: 'bold', backgroundColor: '#A3CCFF00' });
var month_select = ui.Select({
    items: [
        { label: "January", value: 1 },
        { label: "February", value: 2 },
        { label: "March", value: 3 },
        { label: "April", value: 4 },
        { label: "May", value: 5},
        { label: "June", value: 6},
        { label: "July", value: 7},
        { label: "August", value: 8},
        { label: "September", value: 9},
        { label: "October", value: 10},
        { label: "November", value: 11},
        { label: "December", value: 12},
    ],

    value: 8,
    style: { width: '240px' }
});


var label_period_select = ui.Label('Select period', { fontWeight: 'bold', backgroundColor: '#A3CCFF00' });
var period_select = ui.Select({
    items: [
        { label: "first-weekly",   value: "first-weekly"},
        { label: "second-weekly",  value: "second-weekly"},
        { label: "third-weekly",   value: "third-weekly"},
        { label: "fourth-weekly",  value: "fourth-weekly"},
        { label: "first-biweekly", value: "first-biweekly"},
        { label: "second-biweekly",value: "second-biweekly"},
        { label: "monthly",        value: "monthly"},
    ],
    value: "monthly",
    style: { width: '240px' }
});


var label_improve_cloud_select = ui.Label('cloud cover (0.0 - 1.0):', { fontWeight: 'bold', backgroundColor: '#A3CCFF00' });
var improve_cloud_select = ui.Slider({
    min: 0,
    max: 1.0,
    value: 0.2,
    step: 0.05,
    style: { width: '250px', fontWeight: 'bold', border: '1px solid black', backgroundColor: '#A3CCFF00', }
});

var asset_label = ui.Label('export to asset', { fontWeight: 'bold', backgroundColor: '#A3CCFF00' });
var asset_select = ui.Textbox({
    value: 'projects/nexgenmap/MOSAIC/production-1',
    style: { width: '250px' },
    onChange: function (text) {
        var Start_base = text;
    }
});

panel.add(Header);
panel.add(label_grid_select);
panel.add(grid_select);
panel.add(label_year_select);
panel.add(year_select);
panel.add(label_month_select);
panel.add(month_select);
panel.add(label_period_select);
panel.add(period_select);
panel.add(label_improve_cloud_select);
panel.add(improve_cloud_select);
panel.add(asset_label);
panel.add(asset_select);


ui.root.add(panel);

var buttonStyle = {
    position: 'top-center',
    border: '1px solid #000000AA',
    width: '100px',
}

var buttonExport = ui.Button({
  label: 'Export',
  style: buttonStyle,
});

var buttonVisualize = ui.Button({
  label: 'Visualize',
  style: buttonStyle,
});

var panel2 = ui.Panel({
  widgets: [buttonExport, buttonVisualize],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {
    position: 'top-center',
    backgroundColor: '#A3CCFF90',
  }
})

buttonExport.style().set(buttonStyle);
buttonVisualize.style().set(buttonStyle);

Map.add(panel2);

var periods = {
  "first-weekly"   : [1, 8, "weekly"],
  "second-weekly"  : [8, 16, "weekly"],
  "third-weekly"   : [16, 23, "weekly"],
  "fourth-weekly"  : [23, 1, "weekly"],
  "first-biweekly" : [1, 16, "biweekly"],
  "second-biweekly": [16, 1, "biweekly"],
  "monthly"        : [1, 1, "monthly"]
}

function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function getPeriod(){
  var year = year_select.getValue()
  var month = month_select.getValue()
  var period = period_select.getValue()
  var startDay = periods[period][0]
  var endDay = periods[period][1]
  var cadence = periods[period][2]
  
  var startDate = pad(year, 4) + "-" + pad(month, 2) + "-" +  pad(startDay, 2)
  if(period == "fourth-weekly" || period == "second-biweekly" || period == "monthly"){
    if(month == 12){
      year = year + 1
      month = 0
    }
    var endDate = pad(year, 4) + "-" + pad(month+1, 2) + "-" +  pad(endDay, 2)
  }else{
    var endDate = pad(year, 4) + "-" + pad(month, 2) + "-" +  pad(endDay, 2)
  } 
  return [startDate, endDate, cadence]
}

exports.grid = grid_select
exports.period = getPeriod
exports.cloud_cover = improve_cloud_select
exports.asset = asset_select
exports.export = buttonExport
exports.visualize = buttonVisualize
