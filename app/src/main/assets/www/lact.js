//lact.js

var MINUTE = 60; //60 // 60 seconds

var resource = {
	START: "START",
	CHANGE: "ZMIANA",
	FINISH: "KONIEC"
};

var lacTimerSettings = {
	sessions : [7, 7, 5, 5, 3, 3], // subsessions

    // notification toggles
    vibrate: true,
    beep: false,
    notify: false,

    // notification offsets - at how many seconds remaining should this event be fired
    vibrateOffset: 5,
    beepOffset: -15,
    notifyOffset: 0
};

var currentState = {
    inProgress: false,
    currentSession: 0,
    currentSessionLength: lacTimerSettings.sessions[this.currentSession] * MINUTE,
    currentSessionStartTime: Date.now(),
    currentSessionTimerObject: null,
	
	timeLeft: function() {
		return this.currentSessionLength * 1000 - (Date.now() - this.currentSessionStartTime);
	},

    secondsLeft: function() {
        return Math.ceil(this.timeLeft() / 1000);
    },

    isLastSession: function() {
        return this.currentSession == lacTimerSettings.sessions.length - 1;
    },
    notificationTimers: []
};

// jQuery objects  --> to be replaced by Angular bindings?
var buttonObject;
var timerObject;
var sessionsObject;

function formatTimer(seconds) {
	var negative = (seconds < 0);
	if (negative) { 
		seconds *= -1;
	}
	var secs = seconds % 60;
	var mins = Math.floor(seconds / 60);
	return (negative ? "-" : "") + mins + (secs < 10 ? ":0" : ":") + secs;
}

function setUpNotifications(session) {
    var thisSessionRemaining = currentState.timeLeft();
	killTimers();
    currentState.notificationTimers = [];
	
    if (lacTimerSettings.vibrate 
			&& thisSessionRemaining > 1000 * lacTimerSettings.vibrateOffset) {
        currentState.notificationTimers.push(setTimeout(function() {
            try {
                navigator.notification.vibrate(1000);
            } catch (e) { console.log("LacTimer: Exception when trying to vibrate:" + e); }
        }, thisSessionRemaining - 1000 * lacTimerSettings.vibrateOffset));
    }

    if (lacTimerSettings.beep 
			&& thisSessionRemaining > 1000 * lacTimerSettings.beepOffset) {
        currentState.notificationTimers.push(setTimeout(function() {
            try {
                navigator.notification.beep(1);
            } catch (e) { console.log("LacTimer: Exception when trying to beep:" + e); }
        }, (thisSessionRemaining - 1000 * lacTimerSettings.beepOffset)));
    }

    if (lacTimerSettings.notify
			&& thisSessionRemaining > 1000 * lacTimerSettings.notifyOffset) {
        currentState.notificationTimers.push(setTimeout(function() {
            try {
                navigator.notification.alert("Czas na zmiane!", null, "Zmiana", "OK");
            } catch (e) { console.log("LacTimer: Exception when trying to notify:" + e); }
        }, (thisSessionRemaining - 1000 * lacTimerSettings.notifyOffset)));
    }
}

function killTimers() {
    currentState.notificationTimers.forEach(function(el, idx, ar) { clearTimeout(el); });
    currentState.notificationTimers = [];

    if (currentState.currentSessionTimerObject) {
        clearInterval(currentState.currentSessionTimerObject);
    }
}

var updateTimer = function() {
	var seconds = currentState.secondsLeft();
	timerObject.text(formatTimer(seconds)).removeClass()
		.addClass(seconds > 0 ? 'positive' : 'negative');
};

function prepareSubsession(index) {
    currentState.currentSession = index;
    currentState.currentSessionLength = lacTimerSettings.sessions[index] * MINUTE;
    currentState.currentSessionStartTime = Date.now();
    updateTimer();
    timerObject.removeClass().addClass('positive');
}

function classForSession(index, currentSession) {
    return index == currentSession ? 'current' : (index < currentSession ? 'past' : 'future');
}

function updateSessionPath() {
    for (var i = 0; i < lacTimerSettings.sessions.length; i++) {
        $('li#session' + i).removeClass().addClass(classForSession(i, currentState.currentSession));
    }
}

function startTimer() {
    setUpNotifications(currentState.currentSession);
    currentState.currentSessionTimerObject = setInterval(updateTimer, 1000);
}

function resume() {
	buttonObject.text(currentState.isLastSession() ? resource.FINISH : resource.CHANGE);
    updateSessionPath();
    startTimer();
}

var startSubsession = function(index) {
	killTimers();
    currentState.inProgress = true;
    prepareSubsession(index);
	saveState();
    resume();
};

function storeJQueryObjects() {
    sessionsObject = $('#sessionList');
    timerObject = $('#timer');
    buttonObject = $('#button');
}

function createSessionPath() {
    sessionsObject.text('');
    for (var i = 0; i < lacTimerSettings.sessions.length; i++) {
		var liId = 'session' + i;
        sessionsObject.append('<li class="future" id="' + liId + '"><p>' + lacTimerSettings.sessions[i] + '</p></li>');
		$('li#' + liId).click(function() { 
			startSubsession(this.id.substring(7)); 
		});
    }
}

function reset() {
    killTimers();
	createSessionPath();
	prepareSubsession(0);
    currentState.inProgress = false;
    currentState.currentSession = 0;
    buttonObject.text(resource.START);
}

var nextState = function(e) {
    e.preventDefault();
    if (currentState.inProgress) {
        if (currentState.isLastSession()) {
			clearSavedState();
            reset();
        } else {
            currentState.currentSession++;
            startSubsession(currentState.currentSession);
        }
    } else {
        startSubsession(0);
    }
};

function loadState() {
	try {
		currentState.inProgress = localStorage.inProgress || false;
		currentState.currentSession = localStorage.curSes || 0;
		currentState.currentSessionLength = localStorage.curSesLen || lacTimerSettings.sessions[this.currentSession];
		currentState.currentSessionStartTime = localStorage.curSesStart || lacTimerSettings.sessions[this.currentSession] * MINUTE;
	} catch(e) { console.log('Unable to load state from local storage: ' + e); }
	if (currentState.inProgress) {
		resume();
	} else {
		clearSavedState();
		reset();
	}
}

function saveState() {
	try {
		localStorage.inProgress = currentState.inProgress;
		localStorage.curSes = currentState.currentSession;
		localStorage.curSesLen = currentState.currentSessionLength;
		localStorage.curSesStart = currentState.currentSessionStartTime;
	} catch(e) { console.log('Unable to save state to local storage: ' + e); }
}

function clearSavedState() {
	try {
		localStorage.clear();
	} catch(e) { console.log('Unable to save state to local storage: ' + e); }
}

$(document).ready(function() {
	storeJQueryObjects();
	createSessionPath();
	buttonObject.click(nextState);
	loadState();
	updateTimer();
});
