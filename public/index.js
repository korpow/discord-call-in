var socket;
var updatesOn = true;
var callerTimesPicked = {};
var callerArray = [];

$.when($.ready).then(() => {
  // Document is ready.
  socket = io();
  socket.on('initial_data', SetInitialData);
  socket.on('numbers_data', ParseNumbersData); //caller and screener numbers
  socket.on('wait_join', WaitingAdd);
  socket.on('wait_leave', WaitingRemove);
  socket.on('nick_update', UpdateCallerName);
  socket.on('info_update', UpdateCallerInfo);
  socket.on('backend_error', (message) => {
    alert(message);
  });
});

function WaitingAdd(callerData) {
  callerArray.push(callerData);
  if (updatesOn)
    UpdateCallerDisplay();
}

function WaitingRemove(callerId) {
  callerArray.splice(callerArray.findIndex(val => val.id === callerId), 1);
  if (updatesOn)
    UpdateCallerDisplay();
}

function ToggleUpdates() {
  updatesOn = !updatesOn;
  if (updatesOn) {
    $('#auto_status').removeClass('orange');
    $('#auto_status').text("ON");
    UpdateCallerDisplay(callerArray);
  }
  else {
    $('#auto_status').addClass('orange');
    $('#auto_status').text("PAUSED");
  }
}

function SetInitialData(data) {
  callerArray = data;
  UpdateCallerDisplay()
}

function UpdateCallerDisplay() {
  let newCallerRows = callerArray.sort(SortByName).map((caller) => {
    return ` <tr>
    <td><button onclick="SelectCaller(this)" value="${caller.id}">Unmute</button></td>
    <td style="max-width: 14rem;">${caller.name}</td>
    <td><span onclick="ToggleCallerInfo('${caller.id}', this)">${(caller.infoHidden) ? "[Hidden - Click to Unhide]" : caller.info}</span></td>
  </tr>`
  }).join('\n');
  if (callerArray.length == 0) {
    newCallerRows = `<td></td><td>No Callers Waiting :(</td>`;
  }
  $('tbody').empty();
  $('tbody').append(newCallerRows);
}

function UpdateCallerName(callerId, newName) {
  let callerIndex = callerArray.findIndex(caller => caller.id === callerId);
  if (callerIndex == -1)
    return;
  callerArray[callerIndex].name = newName;
  if (updatesOn)
    UpdateCallerDisplay();
}

function ToggleCallerInfo(callerId, span) {
  let callerIndex = callerArray.findIndex(caller => caller.id === callerId);
  if (callerIndex == -1)
    return;
  callerArray[callerIndex].infoHidden = !callerArray[callerIndex].infoHidden;
  if (callerArray[callerIndex].infoHidden) {
    span.innerHTML = "[Hidden - Click to Unhide]";
  }
  else {
    span.innerHTML = callerArray[callerIndex].info;
  }
}

function UpdateCallerInfo(callerId, newInfo) {
  let callerIndex = callerArray.findIndex(caller => caller.id === callerId);
  if (callerIndex == -1)
    return;
  callerArray[callerIndex].info = newInfo;
  if (updatesOn)
    UpdateCallerDisplay();
}

function SelectCaller(button) {
  button.disabled = true;
  socket.emit('select_caller', button.value, button.innerText, (result) => {
    switch (result) {
      case 'success':
        setTimeout(() => {
          button.disabled = false;
        }, 350);
        button.innerText = 'End Call';
        break;
      case 'success2':
      case 'not_waiting':
        button.innerText = 'Caller Gone';
        break;
    }
  });
}

function ParseNumbersData(data) {
  $('#callers_num').text(data.waiting);
}


function SortByName(a, b) {
  var nameA = a.name.toUpperCase(); // ignore upper and lowercase
  var nameB = b.name.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}
