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
  socket.on('backend_error', (message) => {
    alert(message);
  });
});

function WaitingAdd(callerData) {
  callerArray.push(callerData);
  if (updatesOn) {
    UpdateCallerRows();
  }
}

function WaitingRemove(callerId) {
  callerArray.splice(callerArray.findIndex(val => val.id === callerId), 1);
  if (updatesOn) {
    UpdateCallerRows();
  }
}

function ToggleUpdates() {
  updatesOn = !updatesOn;
  if (updatesOn) {
    $('#auto_status').removeClass('orange');
    $('#auto_status').text("ON");
    UpdateCallerRows(callerArray);
  }
  else {
    $('#auto_status').addClass('orange');
    $('#auto_status').text("PAUSED");
  }
}

function SetInitialData(data) {
  callerArray = data;
  UpdateCallerRows()
}

function UpdateCallerRows() {
  let newCallerRows = callerArray.sort(SortByName).map((caller) => {
    return `<tr>
    <td><button onclick="SelectCaller(this)" value="${caller.id}">Select</button></td>
    <td>${caller.name}</td>
    <td>${(callerTimesPicked[caller.id]) ? callerTimesPicked[caller.id] : "Not yet screened"}</td>
  </tr>`
  }).join('\n');
  $('tbody').empty();
  $('tbody').append(newCallerRows);
}

function SelectCaller(button) {
  button.disabled = true;
  socket.emit('select_caller', button.value, (result) => {
    switch (result) {
      case 'success':
        button.innerText = 'Selected';
        callerTimesPicked[button.value] ? callerTimesPicked[button.value]++ : callerTimesPicked[button.value] = 1;
        break;
      case 'no_screeners':
        setTimeout(() => {
          button.disabled = false;
        }, 350);
        alert("No screeners are available for this caller, please try again when one is available.");
        break;
      case 'not_waiting':
        button.innerText = 'Caller Gone';
        break;
    }
  });
}

function ParseNumbersData(data) {
  $('#callers_num').text(data.waiting);
  $('#screeners_num').text(`${data.screen_ready}/${data.screen_total}`);
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
