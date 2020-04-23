//********************************************************
//	Originally Created by Joe Kaylen / CSOD
//	Feb 2020
//                Contents
//	Variables
//	Page Setup
//	Instructor/Participant Mode
//	User Signature functionality
//	LO Selection
//	QR Code Searching
//	User Selection
//	Submitting & PDF
//********************************************************

var bolIndividualScoring = false;
var intMaxPerFile = 25;
var strMatchUserBy = 'id';
var bolSignature = true;
var bolSignatureWatermark = false;
var strSignatureStatement = 'I agree that I fully understand the topics covered in this course and will abide by all policies presented.';
var bolInstructorSignature = false;
var bolCheckTimeStamp = false;
var strTranslationsURL = 'https://scfiles.csod.com/labs/expressClass/translations/';
//General Express Class Setup
var strCulture, strAPIPath, strToken, strCorp, strVersion;
var objECLocalization;
var objCustomLocalization = {};
objCustomLocalization.data = {};
var objECPageConfiguration;
var strFileID;
var strLOID;
var facilitatorUserId, timezoneId, completionDate;
var bolInstructor = true;
var instructorPin = '';
//QR Code Scanning
var video = document.createElement("video");
var canvasElement;
var canvas;
var loadingMessage;
var outputContainer;
var outputMessage;
var outputData;
var myStream;
var strLastCode;
bolSearching = false;

var objIdToType = {};

var arrSelectedUsers = [];

var objExpressClass = {};

var doc;	//Holds PDF

var signaturePad;
var intSigUserID = '';

var arrBulkUsers = [];

function initExpressClass(objOpt) {
	if(!document.getElementById('modalLoading')) {
		createLoadingModal();
	}

	objOpt = objOpt || {};
	if('RecordUserScores' in objOpt) {
		bolIndividualScoring = objOpt.RecordUserScores;
	}
	if('Signature' in objOpt) {
		bolSignature = objOpt.Signature;
	}
	if('SignatureMessage' in objOpt) {
		strSignatureStatement = objOpt.SignatureMessage;
	}
	if('SignatureWatermark' in objOpt) {
		bolSignatureWatermark = objOpt.SignatureWatermark;
	}
	if(('InstructorSignature' in objOpt) && (bolSignature == true)) {
		bolInstructorSignature = objOpt.InstructorSignature;
	}
	if(!bolSignature) { bolInstructorSignature = false; }
	if('MatchQRCodeBy' in objOpt) {
		strMatchUserBy = objOpt.MatchQRCodeBy;
	}
	if('TranslationsURL' in objOpt) {
		strTranslationsURL = objOpt.TranslationsURL;
	}
	if('MaxSignaturePerFile' in objOpt) {
		if(!isNaN(objOpt.MaxSignaturePerFile) && objOpt.MaxSignaturePerFile < 51) {
			intMaxPerFile = objOpt.MaxSignaturePerFile;
		}
	}
	window.onbeforeunload = function(event) {
		return "you have unsaved changes. Are you sure you want to navigate away?";
	};
	getExpressClassToken();
}


//********************************************************
//                Page Setup
//********************************************************

function getExpressClassToken() {
	//Calling static page to get basic info such as auth
	strURL = "/ui/lms-express-class/app/create/general-info";
	var xhrEC = new XMLHttpRequest();
	xhrEC.onreadystatechange = function() {
		if (xhrEC.readyState == 4 && xhrEC.status == 200) {
			if(xhrEC.responseText.indexOf("Image of Forbidden Icon") > -1 ) {		//Added this in for end users who access this page
				window.location.assign('/common/RestrictedArea.aspx');
			}
			strMC = xhrEC.responseText;
			strAPIPath = strMC.substring(strMC.indexOf('"cloud":')+9,strMC.indexOf('",',strMC.indexOf('"cloud"')));
			strToken = strMC.substring(strMC.indexOf('"token"')+9,strMC.indexOf('",',strMC.indexOf('"token"')));
			strCulture = strMC.substring(strMC.indexOf('"cultureName"')+15,strMC.indexOf('",',strMC.indexOf('"cultureName"')));
			strCorp = strMC.substring(strMC.indexOf('"corp"')+8,strMC.indexOf('",',strMC.indexOf('"corp"')));
			strVersion = strMC.substring(strMC.indexOf('"version"')+11,strMC.indexOf('",',strMC.indexOf('"version"')));
			getECLocalization();
		}
	};
	xhrEC.open("POST", strURL, true);
	xhrEC.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhrEC.send();
}

function getECLocalization() {
	//Get localization
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			objECLocalization = JSON.parse(xhr.responseText);
	        	getCustomLocalization(strCulture);
    		}
  	};
	xhr.open("GET", '/services/x/localization/v1/localizations/ui?culture=' + strCulture + '&groups=LMS.EXPRESSCLASS%2COUPicker', true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	xhr.send();
}

function getCustomLocalization(strTryCulture) {
	//Gets localization for custom text, not avail through CSOD micro-services
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			objCustomLocalization = JSON.parse(xhr.responseText);
	        	getECPageConfiguration();
    		} else if (xhr.readyState == 4 && xhr.status == 404) {
    			getCustomLocalization('en-US');		//fall back to US English if not avail
    		}
  	};
	xhr.open("GET", strTranslationsURL + strTryCulture + '.txt', true);
	xhr.ontimeout = function (e) {
  getCustomLocalization('en-US');
	};
	xhr.timeout = 2500;
	xhr.send();
}

function getECPageConfiguration() {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			objECPageConfiguration = JSON.parse(xhr.responseText);
	        	buildPage();
    		}
  	};
	xhr.open("GET", '/services/api/BFF/ExpressClass/PageConfiguration?', true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	xhr.send();
}

function buildPage() {
	document.getElementById('player-icons').href = "/player-lms-express-class/" + strVersion + "/node_modules/player-core-ui/assets/csod-icons.css";
	elmTimeSelect = document.getElementById('timeCompleted');
	arrKeys = Object.keys(objECPageConfiguration.data[0].dateTime.timeIntervals);
	for(i=0;i<arrKeys.length;i++) {
		var elmOpt = document.createElement("option");
		elmOpt.value = arrKeys[i];
		elmOpt.innerHTML = objECPageConfiguration.data[0].dateTime.timeIntervals[arrKeys[i]];
		if(objECPageConfiguration.data[0].dateTime.timeIntervals[arrKeys[i]] == objECPageConfiguration.data[0].dateTime.currentTime) {
			elmOpt.selected = true;
		}
		elmTimeSelect.appendChild(elmOpt);
	}

	var dateCurr = new Date(Date.parse(objECPageConfiguration.data[0].dateTime.currentDate));
	var tmpMonth = parseInt(dateCurr.getMonth()) + 1;
	var strDateFormat = dateFormat(strCulture);
	if(strDateFormat == 'mm/dd/yyyy') {
		document.getElementById('dateCompleted').value =  tmpMonth + '/' + dateCurr.getDate() + '/' + dateCurr.getFullYear();
	} else if (strDateFormat == 'dd/mm/yyyy') {
		document.getElementById('dateCompleted').value =  dateCurr.getDate() + '/' + tmpMonth + '/' + dateCurr.getFullYear();
	} else if (strDateFormat == 'dd.mm.yyyy') {
		document.getElementById('dateCompleted').value =  dateCurr.getDate() + '.' + tmpMonth + '.' + dateCurr.getFullYear();
	} else {
		document.getElementById('dateCompleted').value =  tmpMonth + '/' + dateCurr.getDate() + '/' + dateCurr.getFullYear();
	}

	elmTimeZoneSelect = document.getElementById('timeZoneCompleted');
	arrKeys = Object.keys(objECPageConfiguration.data[0].timezoneInformation.timezones);
	for(i=0;i<arrKeys.length;i++) {
		var elmOpt = document.createElement("option");
		elmOpt.value = arrKeys[i];
		elmOpt.innerHTML = objECPageConfiguration.data[0].timezoneInformation.timezones[arrKeys[i]];
		if(arrKeys[i] == objECPageConfiguration.data[0].timezoneInformation.currentTimezone.key) {
			elmOpt.selected = true;
		}
		elmTimeZoneSelect.appendChild(elmOpt);
	}


	if((objECPageConfiguration.data[0].hasCreateTrainingPermission == true) && (false)) {	//disabled for now, as functionality not built out
		document.getElementById('createNewTrainingBox').style.display = 'block';
	} else {
		document.getElementById('createNewTrainingBox').style.display = 'none';
	}

	document.getElementById('searchTraining').addEventListener("click", openTrainingSearch);
	document.getElementById('txtClose').addEventListener("click", closeTrainingSearch);
	document.getElementById('startScanning').addEventListener("click", startScanQR);
	document.getElementById('closeScan').addEventListener("click", stopScanQR);

	var inp = document.getElementById('searchTrainingBox');

	inp.addEventListener("input", function(e) {
		if (e.key == 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
		var val = this.value;
		if ((!val) || (val.length<3)) { return false;}
		searchLO(val);
	});
	inp.addEventListener("keypress", function(e) {
		e.stopPropagation();
		if (e.key == 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	});
	inp.addEventListener("keydown", function(e) {
		e.stopPropagation();
		if (e.key == 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	});
	document.getElementById('scoringComments').addEventListener("keypress", function(e) {
		e.stopPropagation();
		if (e.key == 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	});
	document.getElementById('scoringComments').addEventListener("keydown", function(e) {
		e.stopPropagation();
		if (e.key == 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	});

	//Video & QR Code setup
	video = document.createElement("video");
	canvasElement = document.getElementById("canvas");
	canvas = canvasElement.getContext("2d");
	loadingMessage = document.getElementById("loadingMessage");
	outputContainer = document.getElementById("output");
	outputMessage = document.getElementById("outputMessage");
	outputData = document.getElementById("outputData");

	//Attendee Search Setup
	document.getElementById('addAttendees').addEventListener("click", openUserSearch);
	document.getElementById('btnUserSearchCancel').addEventListener("click", closeUserSearch);
	document.getElementById('btnUserSearchSave').addEventListener("click", saveSelectUsers);
	getPickerTypes();
	document.getElementById('searchUsers').addEventListener('keypress', function (e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			runUserSearch();
		}
	});

	//User Scoring
	document.getElementById('selectAll').addEventListener("click", selectAllUsers);
	document.getElementById('deselectAll').addEventListener("click", deSelectAllUsers);
	document.getElementById('scoringCancel').addEventListener("click", closeScoring);
	document.getElementById('scoringSave').addEventListener("click", saveUserScoring);
	document.getElementById('removeLink').addEventListener("click", removeAttendees);

	if(bolIndividualScoring) {
		document.getElementById('bulkRecord').addEventListener("click", openUserScoringBulk);
	} else {
		document.getElementById('bulkRecord').style.display='none';
	}

	//User Sig
	if(bolSignature) {
		document.getElementById('scoringFileUploadDiv').style.display = 'none';
	} else {
		document.getElementById('scoringFileUploadDiv').style.display = 'block';
	}

	document.getElementById('cancelSig').onclick = function() { cancelSig(); };
	document.getElementById('signSig').addEventListener("click", signSig);

	//Lock/Unlock
	document.getElementById('inputMode').addEventListener("click", lockPrompt);
	document.getElementById('lockCancel').addEventListener("click", lockCancel);
	document.getElementById('pass1').addEventListener("keyup", pinEntry);
	document.getElementById('pass2').addEventListener("keyup", pinEntry);
	document.getElementById('pass3').addEventListener("keyup", pinEntry);
	document.getElementById('pass4').addEventListener("keyup", pinEntry);

	document.getElementById('pass4').addEventListener("keypress", submitPinEntry);

	//Submit Setup
	document.getElementById('submitButton').addEventListener("click", submitPrompt);

	//Add Instructor signature block, if needed
	if(bolInstructorSignature) {
		//Need to build user object to send
		addUser(objECPageConfiguration.data[0].user, true);
	}
	applyLocalization();
}

function applyLocalization() {
	document.getElementById('txtGeneralInformation').innerHTML = objECLocalization.data["General Information"];
	document.getElementById('txtxCSelectTrainingLabel').innerHTML = objECLocalization.data["xCSelectTrainingLabel"];
	document.getElementById('txtSearch Existing Training').innerHTML = objECLocalization.data["Search Existing Training"];
	document.querySelector("h1[title='Search Existing Training'").innerHTML = objECLocalization.data["Search Existing Training"];
	document.getElementById('txtCreate New Training').innerHTML = objECLocalization.data["Create New Training"];
	document.getElementById('querySelector').innerHTML = objECLocalization.data["Search"];
	document.getElementById('txtCompletion Time').innerHTML = objECLocalization.data["Completion Time"];
	document.getElementById('txtTime Zone').innerHTML = objECLocalization.data["Time Zone"];
	document.getElementById('txtAttendees').innerHTML = objECLocalization.data["Attendees"];
	document.getElementById('txtAddAttendeesDescription').innerHTML = objECLocalization.data["AddAttendeesDescription"] + ' ' + objCustomLocalization.data["You also have the option to scan QR codes."];
	document.getElementById('txtAddAttendees').innerHTML = objECLocalization.data["Add Attendees"];
	document.querySelector('#selectAll span').innerHTML = objECLocalization.data["SelectAll"];
	document.querySelector('#deselectAll span').innerHTML = objECLocalization.data["DeselectAll"];
	document.querySelector('#bulkRecord span').innerHTML = objECLocalization.data["Bulk Record"];
	document.querySelector('#removeLink span').innerHTML = objECLocalization.data["Remove"];
	document.getElementById('txtSubmit').innerHTML = objECLocalization.data["Submit"];
	document.getElementById('lblAddAttendees').innerHTML = objECLocalization.data["Add Attendees"];
	//document.getElementById('lblSearch').innerHTML = objECLocalization.data[""];
	document.querySelector('#btnUserSearchSave span').innerHTML = objECLocalization.data["Save"];
	document.querySelector('#btnUserSearchCancel span').innerHTML = objECLocalization.data["Cancel"];
	document.getElementById('searchUsers').placeHolder = objECLocalization.data["Search by First Name and/or Last Name"];
	document.getElementById('lblResult').innerHTML = objECLocalization.data["Result"];
	document.getElementById('lblComplete').innerHTML = objECLocalization.data["Complete"];
	document.getElementById('lblIncomplete').innerHTML = objECLocalization.data["Incomplete"];
	document.getElementById('lblFail').innerHTML = objECLocalization.data["Fail"];
	document.getElementById('lblScore').innerHTML = objECLocalization.data["Score"];
	document.getElementById('lblComments').innerHTML = objECLocalization.data["Comments"];
	document.querySelector('#scoringCancel span').innerHTML = objECLocalization.data["Cancel"];
	document.querySelector('#scoringSave span').innerHTML = objECLocalization.data["Save"];

	document.querySelector('#signSig span').innerHTML = objCustomLocalization.data["Sign"];
	document.querySelector('#cancelSig span').innerHTML = objECLocalization.data["Cancel"];
	document.getElementById('descriptionSig').innerHTML = objCustomLocalization.data["Sign above"];
	document.getElementById('outputMessage').innerHTML = objCustomLocalization.data["No QR code detected."];
	document.getElementById('loadingMessage').innerHTML = objCustomLocalization.data["Unable to access video stream (please make sure you have a webcam enabled)"]
	document.getElementById('lblMode').innerHTML = objCustomLocalization.data["Instructor Mode"];

	document.querySelector('#startScanning span').innerHTML = objCustomLocalization.data["Scan QR Code"];

	document.getElementById('pdfTableUserName').innerHTML = objECLocalization.data["Username: "];
	document.getElementById('pdfTableFullName').innerHTML = objCustomLocalization.data["Full Name"];
	document.getElementById('pdfTableSignature').innerHTML = objCustomLocalization.data["Signature"];

	if(document.getElementById('modalLoading')) {
		document.getElementById('modalLoading').className = 'p-dialog is-visible';
	}
}

function createLoadingModal() {
	elmDivModal = document.createElement('div');
	elmDivModal.className = "p-dialog is-visible";
	elmDivModal.id = "modalLoading";

	elmDivBG = document.createElement('div');
	elmDivBG.className = "background";
	elmDivBG.style.backgroundColor = 'black';

	elmDivModal.appendChild(elmDivBG);

	elmDivContent = document.createElement('div');
	elmDivContent.className = "content";
	elmDivContent.innerHTML = '<section class="content-body"><div class="p-gridlayout column-device-none center-device-none gutter-vertical-sm-device-none"><div class="p-gridcol"><div class="lds-dual-ring"></div></div></div></section>';

	elmDivModal.appendChild(elmDivContent);

	document.getElementsByTagName('body')[0].appendChild(elmDivModal);
}
//********************************************************
//                Instructor/Participant Mode
//********************************************************

function lockPrompt() {
	if(!bolInstructor) {
		document.getElementById('inputMode').checked = false;
		document.getElementById('lockOk').removeEventListener("click", lockMode);
		document.getElementById('lockOk').addEventListener("click", unlockMode);
		document.getElementById('lockPrompt').innerHTML = objCustomLocalization.data["Please enter your instructor PIN to unlock"];
	} else {
		document.getElementById('lockOk').removeEventListener("click", unlockMode);
		document.getElementById('lockOk').addEventListener("click", lockMode);
		document.getElementById('lockPrompt').innerHTML = objCustomLocalization.data["Set a 4 digit PIN to unlock from instructor mode"];
	}
	document.getElementById('modalLock').style.display = 'flex';
	document.getElementById('pass1').focus();
}
function lockCancel() {
	document.getElementById('modalLock').style.display = 'none';
}

function pinEntry() {
	event.preventDefault();
	event.stopPropagation();
	if(this.value.length > 0) {
		var intCurr = this.getAttribute('data-order');
		if(intCurr < 4) {
			intCurr = parseInt(intCurr) + parseInt(1);
			intCurr = String(intCurr);
			document.getElementById('pass' + intCurr).focus();
		}
	}
}

function submitPinEntry() {
	if(event.key == "Enter") {
		if(!bolInstructor) {
			unlockMode();
		} else {
			lockMode();
		}
		event.stopPropagation();
		event.preventDefault();
		return false;
	}
}

function lockMode() {
	instructorPin = String(document.getElementById('pass1').value) + String(document.getElementById('pass2').value) + String(document.getElementById('pass3').value) + String(document.getElementById('pass4').value);
	bolInstructor = false;
	changeInstructorStatus();
	document.getElementById('modalLock').style.display = 'none';
	document.getElementById('pass1').value = '';
	document.getElementById('pass2').value = '';
	document.getElementById('pass3').value = '';
	document.getElementById('pass4').value = '';

}

function unlockMode() {
	var enteredPin = String(document.getElementById('pass1').value) + String(document.getElementById('pass2').value) + String(document.getElementById('pass3').value) + String(document.getElementById('pass4').value);
	if(enteredPin == instructorPin) {
		bolInstructor = true;
		document.getElementById('inputMode').checked = true;
		changeInstructorStatus();
		document.getElementById('modalLock').style.display = 'none';
	} else {
		bolInstructor = false;
		document.getElementById('inputMode').checked = false;
		document.getElementById('lockPrompt').innerHTML = objCustomLocalization.data["PIN incorrect. Please try again."];
		document.getElementById('pass1').focus();
	}
	document.getElementById('pass1').value = '';
	document.getElementById('pass2').value = '';
	document.getElementById('pass3').value = '';
	document.getElementById('pass4').value = '';
}

function changeInstructorStatus() {
	if(document.getElementById('inputMode').checked == true) {
		//bolInstructor = true;
		document.getElementById('lblMode').innerHTML = objCustomLocalization.data["Instructor Mode"];
	} else {
		//bolInstructor = false;
		document.getElementById('lblMode').innerHTML = objCustomLocalization.data["Participant Mode"];
	}
	var elmsButton = document.querySelectorAll("button[data-button='userAction']");
	for(i=0;i<elmsButton.length;i++) {
		if((bolInstructor) && (bolIndividualScoring)) {
			if(!(bolInstructorSignature && i == 0)) {
				elmsButton[i].innerHTML = '<span class="p-button-text">' + objECLocalization.data["Record"] + '</span></button>';
				elmsButton[i].removeEventListener("click", openSignature);
				elmsButton[i].addEventListener("click", openUserScoringSingle);
			}
		} else if(bolSignature) {
			elmsButton[i].innerHTML = '<span class="p-button-text">' + objCustomLocalization.data["Sign"] + '</span></button>';
			elmsButton[i].removeEventListener("click", openUserScoringSingle);
			elmsButton[i].addEventListener("click", openSignature);
		}
	}
	if(bolInstructor) {
		document.getElementById('addAttendees').style.display = 'inline-block';
		document.getElementById('bulkOptions').style.display = 'block';
		document.getElementById('submitButton').style.display = 'inline';
		document.getElementById('removeLink').style.display = 'inline';
		document.getElementById('timeCompleted').disabled = false;
		document.getElementById('dateCompleted').disabled = false;
		document.getElementById('timeZoneCompleted').disabled = false;
		document.getElementsByTagName('header')[0].style.display = 'table';
		if(document.getElementById('txtxCRemoveTraining')) {
			document.getElementById('txtxCRemoveTraining').style.display = 'inline-block';
		}
	} else {
		document.getElementById('addAttendees').style.display = 'none';
		document.getElementById('bulkOptions').style.display = 'none';
		document.getElementById('submitButton').style.display = 'none';
		document.getElementById('removeLink').style.display = 'none';
		document.getElementById('timeCompleted').disabled = true;
		document.getElementById('dateCompleted').disabled = true;
		document.getElementById('timeZoneCompleted').disabled = true;
		if(document.getElementById('txtxCRemoveTraining')) {
			document.getElementById('txtxCRemoveTraining').style.display = 'none';
		}
		document.getElementsByTagName('header')[0].style.display = 'none';
	}
}

//********************************************************
//                    User Signature
//********************************************************

function cancelSig() {
	document.getElementById('modalSignature').style.display = 'none';
}

function signSig() {
	if(signaturePad.isEmpty()== true) {
		document.getElementById('descriptionSig').innerHTML = objCustomLocalization.data["Signature Required!"];
		document.getElementById('descriptionSig').style.color = 'red';

	} else {
		if(bolSignatureWatermark) {
			var myCanvas = document.getElementsByTagName('canvas')[1];
			var myctx = myCanvas.getContext("2d");
			myctx.font = "18px Arial";
			myctx.fillStyle = "#333333";
			myctx.textAlign = "center";
			myctx.fillText(document.getElementById('dateCompleted').value,myCanvas.width / 2 ,myCanvas.height/2-10, myCanvas.width - 20);
			myctx.fillText(document.getElementById('selectedTrainingTitle').innerHTML,myCanvas.width / 2 ,myCanvas.height/2+10, myCanvas.width - 20);
		}
		document.getElementById('descriptionSig').style.color = 'black';
		var elmLi = document.getElementById("attendee_" + intSigUserID);
		elmLi.querySelector("img[data-field='sigImage']").src = signaturePad.toDataURL("image/jpeg");
		elmLi.querySelector("span[data-field='sigStatus']").classList.remove("p-t-muted");
		elmLi.querySelector("span[data-field='sigStatus']").parentElement.classList.add("p-status-pass");
		elmLi.querySelector("span[data-field='sigStatus']").innerHTML = 'Signed';
		signaturePad.clear();
		document.getElementById('modalSignature').style.display = 'none';
		intSigUserID = '';
		if(bolDuringScan) {
			document.getElementById('modalScanQR').style.display = 'flex';
			changeCamera(strFacingMode);
		}
	}
}

function openSignature() {
	if(event) {
		event.preventDefault();
		event.stopPropagation();
	}

	intUserID = this.getAttribute('data-userid');

	intSigUserID = intUserID;
	document.getElementById('spanSigStatement').innerHTML = strSignatureStatement;
	document.getElementById('descriptionSig').innerHTML = objCustomLocalization.data["Sign above"] + " - " + document.querySelector("#attendee_" + intSigUserID + " span[data-field='fullName']").innerHTML;
	document.getElementById('descriptionSig').style.color = 'black';
	document.getElementById('cancelSig').onclick = function() { cancelSig(); };
	document.querySelector('#cancelSig span').innerHTML = objECLocalization.data["Cancel"];
	document.getElementById('modalSignature').style.display = 'flex';
	signaturePad = new SignaturePad(document.getElementById('sigPad'), {backgroundColor: 'rgb(255,255,255)'});
}

var bolDuringScan = false;
function openSignatureDuringScan() {
	document.getElementById('modalScanQR').style.display = 'none';
	bolDuringScan = true;
	video.pause();
	myStream.getTracks()[0].stop();
	video.srcObject = null;
	//intSigUserID = intUserID;
	document.getElementById('spanSigStatement').innerHTML = strSignatureStatement;
	document.getElementById('descriptionSig').innerHTML = "Sign Above - " + document.querySelector("#attendee_" + intSigUserID + " span[data-field='fullName']").innerHTML;
	document.getElementById('descriptionSig').style.color = 'black';
	document.getElementById('cancelSig').onclick = function() { signaturePad.clear(); };
	document.querySelector('#cancelSig span').innerHTML = objECLocalization.data["Clear"];
	document.getElementById('modalSignature').style.display = 'flex';
	signaturePad = new SignaturePad(document.getElementById('sigPad'), {backgroundColor: 'rgb(255,255,255)'});
}


//********************************************************
//                    LO Searching
//********************************************************

function openTrainingSearch() {
	document.getElementById('modalSearchTraining').style.display = 'block';
	document.getElementById('searchTrainingBox').focus();
	document.getElementsByTagName('body')[0].className = 'p-no-scroll';
	document.getElementsByTagName('body')[0].style.top = '0px';
	document.getElementsByTagName('body')[0].style.position = 'fixed';
	document.getElementsByTagName('body')[0].style.width = '100%';
	document.getElementsByTagName('body')[0].style.height = '100vh';
}
function closeTrainingSearch() {
	document.getElementById('modalSearchTraining').style.display = 'none';
	document.getElementsByTagName('body')[0].className = '';
	document.getElementsByTagName('body')[0].style.top = '';
	document.getElementsByTagName('body')[0].style.position = '';
	document.getElementsByTagName('body')[0].style.width = '';
	document.getElementsByTagName('body')[0].style.height = '';
}

function searchLO(strSearch) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var objLOResults = JSON.parse(xhr.responseText);
			if(objLOResults.data.totalCount > 0) {
		        	populateLOResults(objLOResults);
		        }
    		}
  	};
	xhr.open("GET", '/services/x/training-search-api/v1/search/predictive/trainings?maxResults=10&permissionIds=-990104&searchText=' + strSearch + '&typeIds=2&typeIds=524288&typeIds=1&typeIds=1073741824&typeIds=64&typeIds=67108864', true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	xhr.send();
}

function populateLOResults(objResults) {
	//objResults.data.trainingPreidctiveResultItems[i].id,title,description,relativeImageUrl,durationInSeconds,rating
	elmTrainingList = document.getElementById('trainingList');
	elmTrainingList.innerHTML = '';
	for(i=0;i<objResults.data.trainingPredictiveResultItems.length;i++) {
		var elmLi = document.createElement('li');
		elmLi.className = 'p-p-md p-bw-h-xs p-bs-h-solid p-bc-grey70 p-c-pointer p-bg-grey80';
		elmLi.tabIndex = "0";
		elmLi.setAttribute('data-loid', objResults.data.trainingPredictiveResultItems[i].id);
		elmLi.setAttribute('data-title', objResults.data.trainingPredictiveResultItems[i].title);
		elmLi.setAttribute('data-trainingType', objResults.data.trainingPredictiveResultItems[i].type.typeName);
		elmLi.setAttribute('data-desc', objResults.data.trainingPredictiveResultItems[i].description);
		elmLi.addEventListener("click", function(evt) { selectLO(this) });

		var elmH2 = document.createElement('h2');
		elmH2.className = "p-sectionheader p-f-sz-3x p-t-muted p-t-wr-el";
		elmH2.title = objResults.data.trainingPredictiveResultItems[i].title;
		elmH2.innerHTML = objResults.data.trainingPredictiveResultItems[i].title;
		elmLi.appendChild(elmH2);

		var elmDiv = document.createElement('div');
		elmDiv.className = 'p-p-t-sm';
		elmDiv.innerHTML = '<div class="p-t-wr-el p-fx p-align-items-m"><div class="p-pill p-p-xs p-m-r-sm p-br-5x p-p-h-sm p-bg-grey70"><span class="p-text p-f-sz-md p-t-grey  p-f-w-n p-t-wr-el" title="' + objResults.data.trainingPredictiveResultItems[i].type.typeName + '">' + objResults.data.trainingPredictiveResultItems[i].type.typeName + '</span></div></div>';
		elmLi.appendChild(elmDiv);

		var elmDiv = document.createElement('div');
		elmDiv.className = 'p-p-t-sm';
		elmDiv.innerHTML = '<span class="p-text p-f-sz-md p-t-muted  p-f-w-n p-t-wr-el">' + objResults.data.trainingPredictiveResultItems[i].description + '</span></div>';
		elmLi.appendChild(elmDiv);

		elmTrainingList.appendChild(elmLi);
	}
}

function selectLO(elm) {
	document.getElementById('selectedTrainingTitle').title = elm.getAttribute('data-title');
	document.getElementById('selectedTrainingTitle').innerHTML = elm.getAttribute('data-title');
	document.getElementById('selectedTrainingType').title = elm.getAttribute('data-trainingType');
	document.getElementById('selectedTrainingType').innerHTML = elm.getAttribute('data-trainingType');
	document.getElementById('selectedTrainingDescription').innerHTML = elm.getAttribute('data-desc');

	strLOID = elm.getAttribute('data-loid');

	closeTrainingSearch();
	document.getElementById('selectedTrainingBox').style.display = 'block';
	document.getElementById('txtxCRemoveTraining').addEventListener("click", removeSelectTraining);
	document.getElementById('searchTrainingButtons').style.display = 'none';
}

function removeSelectTraining() {
	document.getElementById('selectedTrainingBox').style.display = 'none';
	document.getElementById('searchTrainingButtons').style.display = 'flex';
}

//********************************************************
//                    QR Code Scanning
//********************************************************
var strFacingMode = 'environment';
function startScanQR() {
	//add flipBtn
	if(!document.getElementById('flipBtn')) {
		var elmButtonFlip = document.createElement("button");
		elmButtonFlip.className = "p-button borderless grey width-auto";
		elmButtonFlip.type = "button";
		elmButtonFlip.id='flipBtn';
		elmButtonFlip.alt = 'Flip Camera';
		elmButtonFlip.title = 'Flip Camera';
		elmButtonFlip.style.display = 'none';
		elmButtonFlip.onclick = function () { changeCamera(); };
		var elmIconFlip = document.createElement('i');
		elmIconFlip.className = "fa-icon-random";
		elmButtonFlip.appendChild(elmIconFlip);
		var elmParent = document.querySelector('#modalScanQR > div.content > footer > div > div:nth-child(1)');
		elmParent.appendChild(elmButtonFlip);
	}
	var supports = navigator.mediaDevices.getSupportedConstraints();
	if(supports['facingMode'] == true ) {
		document.getElementById('flipBtn').style.display = 'inline-block';
	}

	document.getElementById('modalScanQR').style.display = 'flex';

	changeCamera('environment');

	if(bolSignature) {
		bolDuringScan = true;
	}
}

function changeCamera(myFacingMode) {
	if(myFacingMode == null) {
		if(strFacingMode == 'environment') {
			strFacingMode = 'user';
		} else {
			strFacingMode = 'environment';
		}
	} else {
		strFacingMode = myFacingMode;
	}
	try {
		video.pause();
		myStream.getTracks()[0].stop();
		video.srcObject = null;
	}
	catch(err) { }
	navigator.mediaDevices.getUserMedia({ video: { facingMode: strFacingMode } }).then(function(stream) {
		myStream = stream;
		video.srcObject = stream;
		video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
		video.play();
		requestAnimationFrame(tick);
	});

}

function stopScanQR() {
	video.pause();
	document.getElementById('modalScanQR').style.display = 'none';
	myStream.getTracks()[0].stop();
	bolDuringScan = false;
}

function searchUsersQR(strQR) {
	if(strQR.indexOf("|")> -1) {
		var arrSearch = strQR.split("|");
		if(bolCheckTimeStamp) {
			if(arrSearch.length == 3) {
				var dateSent = new Date(arrSearch[2]);
				var currDate = new Date();
				var dif = (currDate - dateSent);
                		dif = Math.round((dif/1000)/60);
				if(dif < 10) {
					searchUsers(arrSearch[0],arrSearch[1]);
				} else {
					outputData.innerText = objCustomLocalization.data["Timestamp Expired!"];
					bolSearching = false;
					changeCamera(strFacingMode);
				}
			} else {
				outputData.innerText = objCustomLocalization.data["Incorrect format for QR Code"] + " " + objCustomLocalization.data["(missing timestamp)"];
				bolSearching = false;
				changeCamera(strFacingMode);
			}
		} else {
			searchUsers(arrSearch[0],arrSearch[1]);
		}
	} else {
		outputData.innerText = objCustomLocalization.data["Incorrect format for QR Code"] ;
		bolSearching = false;
		changeCamera(strFacingMode);
	}
}

function addQRUser(objResults, strUnique) {
	var bolMatch = false;
	if(objResults.data.length > 0) {
		for(i=0; i<objResults.data.length; i++) {
			strMatchBy = strMatchUserBy;
			if((strMatchUserBy == 'id') && (isNaN(strUnique))) {	//if trying to match by ID, but not a number, user userName instead
				strMatchBy = 'userName';
			}
			if(objResults.data[i][strMatchBy] == strUnique) {
				bolMatch = true;
				if(!document.getElementById('attendee_' + objResults.data[i].id)) {
					addUser(objResults.data[i]);
					outputData.innerText = objCustomLocalization.data["Added User"] + ': ' + objResults.data[i].firstName + ' ' + objResults.data[i].lastName;
					bolSearching = false;
					if(bolSignature) {
						intSigUserID = objResults.data[i].id;
						openSignatureDuringScan();
					} else {
						changeCamera(strFacingMode);
					}
				} else {
					outputData.innerText = objCustomLocalization.data["User already added"] + ': ' + objResults.data[i].firstName + ' ' + objResults.data[i].lastName;
					bolSearching = false;
					changeCamera(strFacingMode);
				}
			}
		}
	}
	if(bolMatch == false) {
		outputData.innerText = objCustomLocalization.data["Matching User Not Found"];
		changeCamera(strFacingMode);
	}
	bolSearching = false;

}

function drawLine(begin, end, color) {
	canvas.beginPath();
	canvas.moveTo(begin.x, begin.y);
	canvas.lineTo(end.x, end.y);
	canvas.lineWidth = 4;
	canvas.strokeStyle = color;
	canvas.stroke();
}


function tick() {
	loadingMessage.innerText = "? Loading video..."
	if (video.readyState === video.HAVE_ENOUGH_DATA) {
        	loadingMessage.hidden = true;
	        canvasElement.hidden = false;
	        outputContainer.hidden = false;

	        canvasElement.height = video.videoHeight;
	        canvasElement.width = video.videoWidth;
	        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
	        var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
	        var code = jsQR(imageData.data, imageData.width, imageData.height, {
	          inversionAttempts: "dontInvert",
	        });
	        if (code) {
	          	drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
	          	drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
	          	drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
	          	drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
		        outputMessage.hidden = true;
	          	outputData.parentElement.hidden = false;
	        	//outputData.innerText = code.data;
	        	if(!bolSearching) {
	        		bolSearching = true;
	        		if(strLastCode != code.data) {
	        			video.pause();
					myStream.getTracks()[0].stop();
					video.srcObject = null;
	        			outputData.innerText = objCustomLocalization.data["Searching..."];
	        			strLastCode = code.data;
			        	searchUsersQR(code.data);
			        } else {
			        	bolSearching = false;
			        }
		        }
		}
	}
	requestAnimationFrame(tick);
}

//********************************************************
//                    User Searching
//********************************************************

//Get OU Options for Add Attendees
function getPickerTypes() {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var objPickerTypes = JSON.parse(xhr.responseText);
	        	populatePickerTypes(objPickerTypes);
    		}
  	};
	xhr.open("GET", '/services/x/core-picker-service/v1/pickertypes', true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	xhr.send();
}

function populatePickerTypes(objPickerTypes) {
	elmPickerTypes = document.getElementById('pickerTypeList');
	for(i=0;i<objPickerTypes.data.length;i++) {
		objIdToType[objPickerTypes.data[i].id] = objPickerTypes.data[i].title;
		if(objPickerTypes.data[i].isActive == true) {
			var elmOption = document.createElement('option');
			elmOption.value = objPickerTypes.data[i].id;
			elmOption.innerHTML = objPickerTypes.data[i].title;
			if(objPickerTypes.data[i].isDefault == true) {
				elmOption.selected = true;
			}
			elmPickerTypes.appendChild(elmOption);
		}
	}
}

function openUserSearch() {
	searchUsers();
	document.getElementById('modalUserSearch').style.display = 'flex';
	document.getElementsByTagName('body')[0].className = 'p-no-scroll';
	document.getElementsByTagName('body')[0].style.top = '0px';
	document.getElementsByTagName('body')[0].style.position = 'fixed';
	document.getElementsByTagName('body')[0].style.width = '100%';
	document.getElementsByTagName('body')[0].style.height = '100vh';
}

function closeUserSearch() {
	document.getElementById('modalUserSearch').style.display = 'none';
	document.getElementsByTagName('body')[0].className = '';
	document.getElementsByTagName('body')[0].style.top = '';
	document.getElementsByTagName('body')[0].style.position = '';
	document.getElementsByTagName('body')[0].style.width = '';
	document.getElementsByTagName('body')[0].style.height = '';
}


function runUserSearch() {
	searchUsers(document.getElementById('searchUsers').value, 0,document.getElementById('pickerTypeList').value);
}

function searchUsers(strUser,strUnique,ouTypeID,pageToken) {
	strUser = strUser || '';
	strUnique = strUnique || 0;
	ouTypeID = ouTypeID || -1;
	pageToken = pageToken || '';

	//strUser = encodeURIComponent(strUser);
	var objRequest = {};
	objRequest.pageSize = 20;
	objRequest.intent = "-990101";
	if(strUser !='') {
		objRequest.searchText = strUser;
	}
	if(ouTypeID != -1) {
		objRequest.ouTypeID = parseInt(ouTypeID);
		var strURL = '/services/x/core-picker-service/v1/ous/search';
	} else {
		var strURL = '/services/x/core-picker-service/v1/users/search';
	}
	if(pageToken != '') {
		objRequest.pageToken = pageToken;
	}
	var params = JSON.stringify(objRequest);

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			objSearchResults = JSON.parse(xhr.responseText);	//Global variable
			if(strUnique == 0) {
				if(objSearchResults.data.length > 0) {
					if(objSearchResults.data[0].typeId == "-1") {
						populateUserSearchResults();
					} else {
						populateUserSearchResults();
					}
		        	} else {
		        		//What happens if no results
		        	}
		        } else {
		        	addQRUser(objSearchResults,strUnique);
		        }
    		}
  	};
	xhr.open("POST", strURL, true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	xhr.send(params);
}

var intTotalSearchResults = 0;
var SearchStartCount = 1;
var SearchEndCount = 20;
var SearchNextPage;
var SearchPreviousPage;

var objSearchResults = {};
function populateUserSearchResults() {
	var elmList = document.getElementById('SearchResultsList');
	elmList.innerHTML = '';
	document.getElementById('SearchResultsList');
	SearchNextPage = objSearchResults.pageInfo.nextPageToken;
	SearchPreviousPage = objSearchResults.pageInfo.previousPageToken;
	if(objSearchResults.pageInfo.totalCount > 0) {
		intTotalSearchResults = objSearchResults.pageInfo.totalCount;
	}

	for(i=0;i<objSearchResults.data.length;i++) {
		populateUserSearchResultAdd(objSearchResults.data[i],i);
	}

	//Add the result count and pagination
	var elmPageNationDiv = document.createElement('div');
	elmPageNationDiv.className ="p-panel p-p-t-sm";

	var elmSecondDiv = document.createElement('div');

	var elmThirdDiv = document.createElement('div');
	elmThirdDiv.className = "p-gridlayout center-device-none end-device-sm middle-device-none gutter-horizontal-sm-device-none gutter-vertical-sm-device-none";

	var elmCountDiv = document.createElement('div');
	elmCountDiv.className = "p-gridcol col-12-device-none col-auto-device-sm";

	var elmSpanCount  = document.createElement('div');
	elmSpanCount.className = "p-text p-f-sz-md p-t-meta  p-f-w-6";
	if(SearchEndCount > intTotalSearchResults) { SearchEndCount = intTotalSearchResults;}
	elmSpanCount.innerHTML = SearchStartCount + ' - ' + SearchEndCount + ' of ' + intTotalSearchResults + ' Results';
	elmCountDiv.appendChild(elmSpanCount);
	elmThirdDiv.appendChild(elmCountDiv);

	var elmPreviousDiv = document.createElement('div');
	elmPreviousDiv.className ="p-gridcol col-auto-device-none";

	if((SearchPreviousPage != '') && (SearchPreviousPage != null)) {
		var elmPrevButton = document.createElement('div');
		elmPrevButton.className ="p-button borderless grey width-auto is-disabled";
		elmPrevButton.title = objECLocalization.data["Previous Page"];
		elmPrevButton.type = "button";
		elmPrevButton.innerHTML = '<span class="p-icon-right-cursor p-rotate-180 p-rtl-flip"></span>';
		elmPrevButton.addEventListener("click", loadPreviousPage);
		elmPreviousDiv.appendChild(elmPrevButton);
	}
	elmThirdDiv.appendChild(elmPreviousDiv);

	var elmNextDiv = document.createElement('div');
	elmNextDiv.className ="p-gridcol col-auto-device-none";

	if((SearchNextPage != '') && (SearchNextPage != null)) {
		var elmNextButton = document.createElement('div');
		elmNextButton.className ="p-button borderless grey width-auto";
		elmNextButton.title = objECLocalization.data["Next Page"];
		elmNextButton.type = "button";
		elmNextButton.innerHTML = '<span class="p-icon-right-cursor p-rtl-flip"></span>';
		elmNextButton.addEventListener("click", loadNextPage);
		elmNextDiv.appendChild(elmNextButton);
	}
	elmThirdDiv.appendChild(elmNextDiv);

	elmSecondDiv.appendChild(elmThirdDiv);
	elmPageNationDiv.appendChild(elmSecondDiv);
	elmList.appendChild(elmPageNationDiv);
}

function loadPreviousPage() {
	SearchStartCount = SearchStartCount - 20;
	SearchEndCount = SearchStartCount + 20;
	if(SearchEndCount > intTotalSearchResults) { SearchEndCount = intTotalSearchResults;}
	searchUsers(document.getElementById('searchUsers').value,0,document.getElementById('pickerTypeList').value,SearchPreviousPage);
}

function loadNextPage() {
	SearchStartCount = SearchStartCount + 20;
	SearchEndCount = SearchStartCount + 20;
	if(SearchEndCount > intTotalSearchResults) { SearchEndCount = intTotalSearchResults;}
	searchUsers(document.getElementById('searchUsers').value,0,document.getElementById('pickerTypeList').value,SearchNextPage);
}

function populateUserSearchResultAdd(objUser,intArrNum) {
	var elmList = document.getElementById('SearchResultsList');

	var elmMasterDiv = document.createElement('div');
	elmMasterDiv.className = 'p-panel p-p-h-md p-p-v-md p-bw-b-xs p-bc-grey70 p-bs-b-solid';
	elmMasterDiv.setAttribute('data-tag',"oupicker-search-result-item");

	var elmSecondDiv = document.createElement('div');

	var elmThirdDiv = document.createElement('div');
	elmThirdDiv.className = "p-gridlayout middle-device-none gutter-horizontal-sm-device-none";

	//Checkbox Div
	var elmCheckboxDiv = document.createElement('div');
	elmCheckboxDiv.className = 'p-gridcol col-auto-device-none';

	var elmCheckboxDivTwo = document.createElement('div');
	elmCheckboxDivTwo.setAttribute('data-tag', "ou-checkbox");

	var elmCheckboxDivThree = document.createElement('div');

	var elmLabel = document.createElement('label');
	elmLabel.className = 'p-checkbox enabled';

	var elmInput = document.createElement('input');
	elmInput.type = 'checkbox';
	elmInput.id = objUser.id;
	elmInput.value = "on";
	elmLabel.appendChild(elmInput);

	var elmInnerDiv = document.createElement('div');
	elmInnerDiv.className = 'checkbox-indicator p-bg-grey80 p-bc-grey60 p-bg-hv-grey70';
	elmInnerDiv.addEventListener("click", changeSelectUser);
	elmInnerDiv.setAttribute('data-arrNum', intArrNum);
	elmInnerDiv.setAttribute('data-selected', 'false');
	elmInnerDiv.setAttribute('data-userid', objUser.id);
	elmLabel.appendChild(elmInnerDiv);

	elmCheckboxDivThree.appendChild(elmLabel);
	elmCheckboxDivTwo.appendChild(elmCheckboxDivThree);
	elmCheckboxDiv.appendChild(elmCheckboxDivTwo);
	elmThirdDiv.appendChild(elmCheckboxDiv);

	//Image Div
	var elmImageOuterDiv = document.createElement('div');
	elmImageOuterDiv.className = "p-gridcol col-auto-device-none";

	var elmImageDiv = document.createElement('div');
	elmImageDiv.className = "p-panel";
	elmImageDiv.style.overflow = 'hidden';
	elmImageDiv.style.width = '40px';

	var elmSubSecondDiv = document.createElement('div');

	var elmImage = document.createElement('img');
	elmImage.className="p-image-large";
	if(objUser.typeId != -1) {
		elmImage.src = '/phnx/images/controls/ou-picker/icon-ou.svg';
	} else if((objUser.icon == '') || (objUser.icon == null)) {
		elmImage.src = '/phnx/images/controls/ou-picker/icon-ou.svg';
	} else {
		var strRoot = objECPageConfiguration.data[0].user.icon;
		strRoot = '/clientimg/' + strCorp + '/users/photos/100/';
		elmImage.src = strRoot + objUser.icon;
	}

	elmSubSecondDiv.appendChild(elmImage);
	elmImageDiv.appendChild(elmSubSecondDiv);
	elmImageOuterDiv.appendChild(elmImageDiv);
	elmThirdDiv.appendChild(elmImageOuterDiv);

	//Data div
	var elmDataOuterDiv = document.createElement('div');
	elmDataOuterDiv.className = "p-gridcol col-fill-device-none";

	var elmSubSecondDiv = document.createElement('div');

	var elmSubThirdDiv = document.createElement('div');
	elmSubThirdDiv.className = "p-p-b-xs";

	var elmSpan = document.createElement('span');
	elmSpan.className = "p-text p-f-sz-lg p-t-default  p-f-w-6 p-t-wr-el";
	if(objUser.typeId == -1) {
		elmSpan.innerHTML = objUser.firstName + ' ' + objUser.lastName;
	} else {
		elmSpan.innerHTML = objUser.title;
	}

	elmSubThirdDiv.appendChild(elmSpan);
	elmSubSecondDiv.appendChild(elmSubThirdDiv);	//Name spans


	var elmSubDiv = document.createElement('div');

	var elmSubDivData = document.createElement('div');
	elmSubDivData.className = 'p-gridlayout cols-12-device-none cols-auto-device-xs gutter-horizontal-md-device-none';

	elmSubDivData.appendChild(buildSubData(objECLocalization.data["ID:"],objUser.id));
	elmSubDivData.appendChild(buildSubData(objECLocalization.data["Type:"],objIdToType[objUser.typeId]));
	if(objUser.typeId == -1) {
		elmSubDivData.appendChild(buildSubData(objECLocalization.data["Manager:"],objUser.managerName));
		elmSubDivData.appendChild(buildSubData(objECLocalization.data["Username: "],objUser.userName));
	} else {
		var strParent = objUser.parentTitle;
		if(strParent == null) { strParent = ''; }
		elmSubDivData.appendChild(buildSubData(objECLocalization.data["Parent:"],strParent));
		var strOwner = objUser.ownerFirstName + ' ' + objUser.ownerLastName;
		if(objUser.ownerFirstName == null) { strOwner = ''; }
		elmSubDivData.appendChild(buildSubData(objECLocalization.data["Owner: "],strOwner));
	}
	elmSubDivData.appendChild(buildSubData(objECLocalization.data["Status:"],objUser.status));

	elmSubDiv.appendChild(elmSubDivData);
	elmSubSecondDiv.appendChild(elmSubDiv);		//Sub data div set
	elmDataOuterDiv.appendChild(elmSubSecondDiv);

	if(("hasChildren" in objUser) && (objUser.hasChildren == true)) {
		var elmChildrenDiv = document.createElement("div");
		elmChildrenDiv.className = "p-m-t-md";

		var elmChildrenSecondDiv = document.createElement("div");

		var elmChildrenThirdDiv = document.createElement("div");

		var elmLabel = document.createElement("label");
		elmLabel.for = "checkboxSub_" + objUser.id;
		elmLabel.className = "p-checkbox enabled";

		var elmSpan = document.createElement('span');
		elmSpan.className ="checkbox-label";
		elmSpan.innerHTML = objCustomLocalization.data["Include Subordinates"];
		elmLabel.appendChild(elmSpan);

		var elmInputSub = document.createElement("input");
		elmInputSub.type = "checkbox";
		elmInputSub.id = "checkboxSub_" + objUser.id;
		elmInputSub.value = "on";
		elmLabel.appendChild(elmInputSub);

		var elmDivSub = document.createElement("div");
		elmDivSub.className = "checkbox-indicator p-bg-grey80 p-bc-grey60 p-bg-hv-grey70";
		elmDivSub.id = "divSub_" + objUser.id;
		elmDivSub.setAttribute('data-selected','false');
		elmDivSub.setAttribute('data-field','includeSubs');
		elmDivSub.addEventListener("click",changeSub);
		elmLabel.appendChild(elmDivSub);


		elmChildrenThirdDiv.appendChild(elmLabel);
		elmChildrenSecondDiv.appendChild(elmChildrenThirdDiv);
		elmChildrenDiv.appendChild(elmChildrenSecondDiv);

		elmDataOuterDiv.appendChild(elmChildrenDiv);
	}

	elmThirdDiv.appendChild(elmDataOuterDiv);

	elmSecondDiv.appendChild(elmThirdDiv);
	elmMasterDiv.appendChild(elmSecondDiv);

	elmList.appendChild(elmMasterDiv);

}

function buildSubData(strField,strValue) {
	var elmDiv = document.createElement('div');
	elmDiv.className = "p-gridcol";

	var elmSpan = document.createElement('span');
	elmSpan.className = "p-text p-f-sz-md p-t-default  p-f-w-6";
	elmSpan.innerHTML = strField;
	elmDiv.appendChild(elmSpan);

	var elmSpan = document.createElement('span');
	elmSpan.className = "p-text p-f-sz-md p-t-default  p-f-w-n p-t-wr-fw";
	elmSpan.innerHTML = strValue;
	elmDiv.appendChild(elmSpan);

	return elmDiv;
}

function saveSelectUsers() {
	var elmsExistingUsers = document.querySelectorAll("#attendeesList li");
	var arrExistingUsers = [];
	for(i=0;i<elmsExistingUsers.length;i++) {
		arrExistingUsers.push(parseInt(elmsExistingUsers[i].getAttribute('data-id')));
	}
	for(i=0;i<arrSelectedUsers.length;i++) {
		if(arrSelectedUsers[i].typeId == -1) {
			if(!arrExistingUsers.includes(arrSelectedUsers[i].id)) {
				addUser(arrSelectedUsers[i]);
			}
		} else {
			addUsersByOU(arrSelectedUsers[i]);
		}
	}
	arrSelectedUsers = [];
	var elmList = document.getElementById('SearchResultsList');
	elmList.innerHTML = '';
	closeUserSearch();
}

function addUsersByOU(objOU) {
	//strUser = encodeURIComponent(strUser);
	var objRequest = {};
	objRequest.ouDetails = [];
	var tmpObj = {};
	tmpObj.includeSubs = false;
	if(document.getElementById("divSub_" + objOU.id)) {
		if(document.getElementById("divSub_" + objOU.id).getAttribute('data-selected') == 'true') {
			tmpObj.includeSubs = true;
		}
	}

	tmpObj.ouId = objOU.id;
	objRequest.ouDetails.push(tmpObj);

	var params = JSON.stringify(objRequest);

	strURL = strAPIPath + 'lms-express-class/v1/ExpressClass/ResolveUsersInOU';
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var objOUResults = JSON.parse(xhr.responseText);
			if(parseInt(objOUResults.data.ouIdToUserCount[objOU.id]) > 0) {
				var elmsExistingUsers = document.querySelectorAll("#attendeesList li");
				var arrExistingUsers = [];
				for(i=0;i<elmsExistingUsers.length;i++) {
					arrExistingUsers.push(parseInt(elmsExistingUsers[i].getAttribute('data-id')));
				}

				var arrOUUserObjects = objectValues(objOUResults.data.userDetailsMap);
				arrOUUserObjects.sort(function (a, b) { return (a.lastName > b.lastName) ? 1 : (a.lastName === b.lastName) ? ((a.firstName > b.firstName) ? 1 : -1) : -1 });
				for(i=0;i<arrOUUserObjects.length;i++) {
					addUser(arrOUUserObjects[i]);
				}
			}
		}
  	};
	xhr.open("POST", strURL, true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	xhr.send(params);
}


function changeSelectUser() {
	var intArrNumber = this.getAttribute('data-arrNum');
	var intUserID = objSearchResults.data[intArrNumber].id;
	var bolFound = false;
	for(i=0;i<arrSelectedUsers.length;i++) {
		if(arrSelectedUsers[i].id == intUserID) {
			if(this.getAttribute('data-selected') == 'true') {
				arrSelectedUsers.splice(i, 1);
				this.setAttribute('data-selected', 'false');
				//Remove class to make checked
				this.classList.remove("p-icon-check");
				this.classList.remove("p-bg-primary50");
				this.classList.remove("p-bc-primary30");
				this.classList.remove("p-t-on-primary50");
				this.classList.remove("p-bg-hv-primary50");
				this.classList.add("p-bg-grey80");
				this.classList.add("p-bc-grey60");
				this.classList.add("p-bg-hv-grey70");
				bolFound=true;
			} else {
				bolFound = false;
			}
		}
	}
	//Adds in if not found
	if((!bolFound)) {
		var tmpObj = {};
		tmpObj.id = parseInt(objSearchResults.data[intArrNumber].id);
		tmpObj.typeId = objSearchResults.data[intArrNumber].typeId;
		tmpObj.status = objSearchResults.data[intArrNumber].status;
		tmpObj.icon = objSearchResults.data[intArrNumber].icon;
		if(tmpObj.typeId == -1) {
			tmpObj.firstName = objSearchResults.data[intArrNumber].firstName;
			tmpObj.lastName = objSearchResults.data[intArrNumber].lastName;
			tmpObj.userRef = objSearchResults.data[intArrNumber].userRef;
			tmpObj.userName = objSearchResults.data[intArrNumber].userName;
			tmpObj.managerName = objSearchResults.data[intArrNumber].managerName;
		} else {
			tmpObj.title = objSearchResults.data[intArrNumber].title;
			tmpObj.parentTitle = objSearchResults.data[intArrNumber].parentTitle;
			tmpObj.ownerFirstName = objSearchResults.data[intArrNumber].ownerFirstName;
			tmpObj.ownerLastName = objSearchResults.data[intArrNumber].ownerLastName;
			tmpObj.hasChildren = objSearchResults.data[intArrNumber].hasChildren;
			tmpObj.ref = objSearchResults.data[intArrNumber].ref;
		}
		arrSelectedUsers.push(tmpObj);
		//Add class to make checked.
		this.classList.add("p-icon-check");
		this.classList.add("p-bg-primary50");
		this.classList.add("p-bc-primary30");
		this.classList.add("p-t-on-primary50");
		this.classList.add("p-bg-hv-primary50");
		this.classList.remove("p-bg-grey80");
		this.classList.remove("p-bc-grey60");
		this.classList.remove("p-bg-hv-grey70");
		this.setAttribute('data-selected', 'true');
	}
}

function addUser(objUser, bolIsInstructor) {
	bolIsInstructor = bolIsInstructor || false;
	if("userId" in objUser) { objUser.id = objUser.userId; }

	var elmUL = document.getElementById('attendeesList');

	var elmLi = document.createElement('li');
	elmLi.className = 'p-p-md p-p-r-none p-bw-xs p-bs-t-solid p-bc-grey70 p-bs-solid';
	elmLi.id = 'attendee_' + objUser.id;
	elmLi.setAttribute('data-id', objUser.id);
	elmLi.setAttribute('data-instructor', bolInstructor);

	var elmOuterDiv = document.createElement('div');
	elmOuterDiv.className = 'p-gridlayout middle-device-none';
	//Checkbox
	var elmDiv = document.createElement('div');
	elmDiv.className = 'p-gridcol';

	if(!bolIsInstructor) {
		var elmDivSecond = document.createElement('div');
		elmDivSecond.setAttribute('data-tag',"attendees-list-item-checkbox");

		var elmDivThird = document.createElement('div');

		var elmLabel = document.createElement('label');
		elmLabel.className = 'p-checkbox enabled';

		var elmInput = document.createElement('input');
		elmInput.type= "checkbox";
		elmInput.value="on";
		elmInput.id = objUser.id;
		elmLabel.appendChild(elmInput);

		var elmDivCheckbox = document.createElement('div');
		elmDivCheckbox.className = "checkbox-indicator p-bg-grey80 p-bc-grey60 p-bg-hv-grey70";
		elmDivCheckbox.setAttribute('data-selected','false');
		elmDivCheckbox.setAttribute('data-userid', objUser.id);
		elmDivCheckbox.addEventListener("click",changeUser);
		elmLabel.appendChild(elmDivCheckbox);

		elmDivThird.appendChild(elmLabel);
		elmDivSecond.appendChild(elmDivThird);
		elmDiv.appendChild(elmDivSecond);
	}
	elmOuterDiv.appendChild(elmDiv);


	//Image
	var elmDiv = document.createElement('div');
	elmDiv.className = 'p-gridcol';

	var elmImg = document.createElement('img');
	elmImg.className = 'p-image-medium p-image-circle';
	if((objUser.icon == '') || (objUser.icon == null)) {
		elmImg.src = '/phnx/images/controls/ou-picker/icon-ou.svg';
	} else {
		var strRoot = objECPageConfiguration.data[0].user.icon;
		strRoot = '/clientimg/' + strCorp + '/users/photos/100/';
		if(bolIsInstructor) {
			elmImg.src = objUser.icon;
		} else {
			elmImg.src = strRoot + objUser.icon;
		}
	}
	elmImg.alt = "User Image";
	elmDiv.appendChild(elmImg);
	elmOuterDiv.appendChild(elmDiv);

	//Data
	var elmDiv = document.createElement('div');
	elmDiv.className = 'p-gridcol user-info p-m-h-md';
	elmDiv.innerHTML = '<span class="p-text p-f-sz-md p-t-default  p-f-w-6 p-t-wr-el" data-field="fullName">' + objUser.firstName + ' ' + objUser.lastName + '</span>'

	var elmDL = document.createElement('dl');

	elmDL.appendChild(addUserDataPoint(objECLocalization.data["ID:"],objUser.userName,'username'));
	if(bolIndividualScoring) {
		elmDL.appendChild(addUserDataPoint(objECLocalization.data["Score"] + ':',objECLocalization.data["NotApplicable"],'score'));
		elmDL.appendChild(addUserDataPoint(objECLocalization.data["Result"] + ':',objECLocalization.data["NotApplicable"],'result'));
	}
	if(bolSignature) {
			elmDL.appendChild(addUserDataPoint(objCustomLocalization.data["Signature"] + ':',objECLocalization.data["No"],'sigStatus'));
	} else {
			elmDL.appendChild(addUserDataPoint(objCustomLocalization.data["Attachment"] + ':',objECLocalization.data["No"],'attachment'));
	}

	var elmHiddenDiv = document.createElement('div');
	elmHiddenDiv.style.display = 'none';
	elmHiddenDiv.innerHTML = "<span data-field='attachmentID'></span><span data-field='attachmentName'></span><span data-field='attachmentSize'></span><span data-field='status'></span><span data-field='comments'></span><img data-field='sigImage' src=''>";

	elmDL.appendChild(elmHiddenDiv);
	elmDiv.appendChild(elmDL);
	elmOuterDiv.appendChild(elmDiv);

	var elmDiv = document.createElement('div');
	elmDiv.className = 'p-m-r-md';

	var elmInnerDiv = document.createElement('div');
	elmInnerDiv.className = 'p-gridcol';

	if((bolInstructor) && (bolIndividualScoring) && (!bolIsInstructor)) {
		var elmButton = document.createElement('button');
		elmButton.className = 'p-button basic grey width-auto';
		elmButton.innerHTML = '<span class="p-button-text">' + objECLocalization.data["Record"] + '</span></button>';
		elmButton.setAttribute('data-userid',objUser.id);
		elmButton.setAttribute('data-button','userAction');
		elmButton.addEventListener("click", openUserScoringSingle);
		elmInnerDiv.appendChild(elmButton);
	} else if(bolSignature) {
		var elmButton = document.createElement('button');
		elmButton.className = 'p-button basic grey width-auto';
		elmButton.innerHTML = '<span class="p-button-text">' + objCustomLocalization.data["Sign"] + '</span></button>';
		elmButton.setAttribute('data-userid',objUser.id);
		elmButton.setAttribute('data-button','userAction');
		elmButton.addEventListener("click", openSignature);
		elmInnerDiv.appendChild(elmButton);
	}

	elmDiv.appendChild(elmInnerDiv);
	elmOuterDiv.appendChild(elmDiv);

	elmLi.appendChild(elmOuterDiv);

	elmUL.appendChild(elmLi);
}


function addUserDataPoint(strField,strValue,strAttribute) {
	var tmpOuterDiv = document.createElement('div');
	tmpOuterDiv.className = "p-fx";

	var tmpdt = document.createElement('dt');
	tmpdt.className = "p-m-r-xs";

	var tmpSpanID = document.createElement('span');
	tmpSpanID.className = "p-text p-f-sz-md p-t-muted  p-f-w-n p-t-wr-fw";
	tmpSpanID.innerHTML = strField;

	tmpdt.appendChild(tmpSpanID);
	tmpOuterDiv.appendChild(tmpdt);

	var tmpdd = document.createElement('dd');
	tmpdd.className = "p-t-wr-el";

	var tmpSpanValue = document.createElement('span');
	tmpSpanValue.className = "p-text p-f-sz-md p-t-muted  p-f-w-6 p-t-wr-el";
	tmpSpanValue.innerHTML = strValue;
	tmpSpanValue.setAttribute('data-field',strAttribute);

	tmpdd.appendChild(tmpSpanValue);
	tmpOuterDiv.appendChild(tmpdd);

	return tmpOuterDiv;
}

function changeUser() {
	if(this.getAttribute('data-selected') == 'true') {
		this.setAttribute('data-selected', 'false');
		//Remove class to make checked
		this.classList.remove("p-icon-check");
		this.classList.remove("p-bg-primary50");
		this.classList.remove("p-bc-primary30");
		this.classList.remove("p-t-on-primary50");
		this.classList.remove("p-bg-hv-primary50");
		this.classList.add("p-bg-grey80");
		this.classList.add("p-bc-grey60");
		this.classList.add("p-bg-hv-grey70");
	} else {
		this.setAttribute('data-selected', 'true');
		//Add class to make checked.
		this.classList.add("p-icon-check");
		this.classList.add("p-bg-primary50");
		this.classList.add("p-bc-primary30");
		this.classList.add("p-t-on-primary50");
		this.classList.add("p-bg-hv-primary50");
		this.classList.remove("p-bg-grey80");
		this.classList.remove("p-bc-grey60");
		this.classList.remove("p-bg-hv-grey70");
	}
}

function changeSub() {
	if(this.getAttribute('data-selected') == 'true') {
		this.setAttribute('data-selected', 'false');
		//Remove class to make checked
		this.classList.remove("p-icon-check");
		this.classList.remove("p-bg-primary50");
		this.classList.remove("p-bc-primary30");
		this.classList.remove("p-t-on-primary50");
		this.classList.remove("p-bg-hv-primary50");
		this.classList.add("p-bg-grey80");
		this.classList.add("p-bc-grey60");
		this.classList.add("p-bg-hv-grey70");
	} else {
		this.setAttribute('data-selected', 'true');
		//Add class to make checked.
		this.classList.add("p-icon-check");
		this.classList.add("p-bg-primary50");
		this.classList.add("p-bc-primary30");
		this.classList.add("p-t-on-primary50");
		this.classList.add("p-bg-hv-primary50");
		this.classList.remove("p-bg-grey80");
		this.classList.remove("p-bc-grey60");
		this.classList.remove("p-bg-hv-grey70");
	}
}


function selectAllUsers() {
	var elmsLI = document.querySelectorAll("div.checkbox-indicator");
	for(i=0;i<elmsLI.length;i++) {
		if(elmsLI[i].getAttribute('data-selected') == 'false') {
			elmsLI[i].setAttribute('data-selected', 'true');
			//Add class to make checked.
			elmsLI[i].classList.add("p-icon-check");
			elmsLI[i].classList.add("p-bg-primary50");
			elmsLI[i].classList.add("p-bc-primary30");
			elmsLI[i].classList.add("p-t-on-primary50");
			elmsLI[i].classList.add("p-bg-hv-primary50");
			elmsLI[i].classList.remove("p-bg-grey80");
			elmsLI[i].classList.remove("p-bc-grey60");
			elmsLI[i].classList.remove("p-bg-hv-grey70");
		}
	}
}

function deSelectAllUsers() {
	var elmsLI = document.querySelectorAll("div.checkbox-indicator");
	for(i=0;i<elmsLI.length;i++) {
		if(elmsLI[i].getAttribute('data-selected') == 'true') {
			elmsLI[i].setAttribute('data-selected', 'false');
			//Remove class to make checked
			elmsLI[i].classList.remove("p-icon-check");
			elmsLI[i].classList.remove("p-bg-primary50");
			elmsLI[i].classList.remove("p-bc-primary30");
			elmsLI[i].classList.remove("p-t-on-primary50");
			elmsLI[i].classList.remove("p-bg-hv-primary50");
			elmsLI[i].classList.add("p-bg-grey80");
			elmsLI[i].classList.add("p-bc-grey60");
			elmsLI[i].classList.add("p-bg-hv-grey70");
		}
	}
}

function removeAttendees() {
	var elmsCheckboxes = document.querySelectorAll("div[data-selected='true']");
	var intMax = elmsCheckboxes.length-1;
	for(i=intMax;i>=0;i--) {
		var intUserId = elmsCheckboxes[i].getAttribute('data-userid');
		var elmAttendee = document.getElementById('attendee_' + intUserId);
		elmAttendee.parentElement.removeChild(elmAttendee);
	}
}


function openUserScoringBulk() {
	arrBulkUsers = [];
	var elmsSelected = document.querySelectorAll("div[data-selected='true']");
	if(elmsSelected.length == 0) { return false; }
	for(i=0;i<elmsSelected.length;i++) {
		arrBulkUsers.push(elmsSelected[i].getAttribute('data-userid'));
	}
	document.getElementById('UserScoringTitle').innerHTML = objECLocalization.data["Bulk Record"];
	setScoreStatus();
	document.getElementById('scoringStatus').value = '';
	document.getElementById('scoringScore').value = '';
	document.getElementById('scoringComments').value = '';
	document.getElementById('scoringFileList').innerHTML = '';
	document.getElementById('modalUserScoring').style.display = 'flex';

	document.getElementById('lblScoringComplete').addEventListener("click", function(){    setScoreStatus(1); }, false);
	document.getElementById('lblScoringIncomplete').addEventListener("click", function(){    setScoreStatus(-1); }, false);
	document.getElementById('lblScoringFail').addEventListener("click", function(){    setScoreStatus(0); }, false);
}

function openUserScoringSingle() {
	event.preventDefault();
	event.stopPropagation();
	arrBulkUsers = [];
	var intUserID = this.getAttribute('data-userid');
	arrBulkUsers.push(intUserID);

	var elmLi = document.getElementById("attendee_" +intUserID);
	var strName = elmLi.querySelector(".user-info span").innerHTML;
	var intScore = elmLi.querySelector("span[data-field='score']").innerHTML;
	var intStatus = elmLi.querySelector("span[data-field='status']").innerHTML
	var strComments = elmLi.querySelector("span[data-field='comments']").innerHTML

	document.getElementById('UserScoringTitle').innerHTML = strName;
	setScoreStatus(intStatus);
	document.getElementById('scoringStatus').value = intStatus;
	document.getElementById('scoringScore').value = intScore;
	document.getElementById('scoringComments').value = strComments;
	document.getElementById('scoringFileList').innerHTML = '';
	document.getElementById('modalUserScoring').style.display = 'flex';

	document.getElementById('lblScoringComplete').addEventListener("click", function(){    setScoreStatus(1); }, false);
	document.getElementById('lblScoringIncomplete').addEventListener("click", function(){    setScoreStatus(-1); }, false);
	document.getElementById('lblScoringFail').addEventListener("click", function(){    setScoreStatus(0); }, false);
}

function saveUserScoring() {
	var intStatus = document.getElementById('scoringStatus').value;
	var intScore = document.getElementById('scoringScore').value;
	var strComments = document.getElementById('scoringComments').value;
	//Get file id??

	for(i=0;i<arrBulkUsers.length;i++) {
		var elmLi = document.getElementById("attendee_" + arrBulkUsers[i]);
		elmLi.querySelector("span[data-field='score']").innerHTML = intScore;

		elmLi.querySelector("span[data-field='result']").parentElement.classList.remove("p-status-pass");
		elmLi.querySelector("span[data-field='result']").parentElement.classList.remove("p-status-incomplete");
		elmLi.querySelector("span[data-field='result']").parentElement.classList.remove("p-status-fail");
		elmLi.querySelector("span[data-field='result']").classList.remove("p-t-muted");
		if(intStatus == 1) { strStatus=objECLocalization.data["Complete"]; elmLi.querySelector("span[data-field='result']").parentElement.classList.add("p-status-pass"); }
		if(intStatus == -1) { strStatus=objECLocalization.data["Incomplete"]; elmLi.querySelector("span[data-field='result']").parentElement.classList.add("p-status-incomplete"); }
		if(intStatus == 0) { strStatus=objECLocalization.data["Fail"]; elmLi.querySelector("span[data-field='result']").parentElement.classList.add("p-status-fail");}
		elmLi.querySelector("span[data-field='result']").innerHTML = strStatus;
		elmLi.querySelector("span[data-field='status']").innerHTML = intStatus;
		elmLi.querySelector("span[data-field='comments']").innerHTML = strComments;
		//Save file ID's to user record
	}
	arrBulkUsers = [];
	closeScoring();
}

function closeScoring() {
	document.getElementById('modalUserScoring').style.display = 'none';
}

function setScoreStatus(intStatus) {
	intStatus = intStatus || 99;
	document.getElementById('lblScoringComplete').classList.remove('checked');
	document.getElementById('lblScoringIncomplete').classList.remove('checked');
	document.getElementById('lblScoringFail').classList.remove('checked');
	if(intStatus == 1) { document.getElementById('lblScoringComplete').classList.add('checked'); document.getElementById('scoringStatus').value = 1; }
	if(intStatus == -1) { document.getElementById('lblScoringIncomplete').classList.add('checked'); document.getElementById('scoringStatus').value = -1; }
	if(intStatus== 0) { document.getElementById('lblScoringFail').classList.add('checked'); document.getElementById('scoringStatus').value = 0; }

}

function removeAttendee(elm) {
	var intID = elm.getAttribute('data-id');
	document.getElementById('attendeesList').removeChild(document.getElementById('attendee_' + intID));
}

function uploadFile() {
	var strURL = strAPIPath + 'lms-express-class/v1/ExpressClass/AttendeeFile';
	var formData = new FormData();
	formData.append('attendeeFile', file); //NOTE: format may have to change for sending a file created in JS

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var objFileResults = JSON.parse(xhr.responseText);
	        	strFileID = objFileResults.data.attachmentId;
    		}
  	};
	xhr.open("POST", strAPIPath, true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	xhr.send(formData);
}


//********************************************************
//                Submitting
//********************************************************

function submitPrompt() {
	//loop through attendees
	//	if bolIndividualScoring, make sure results. If not, add to error log
	//	if bolSignature, add a list of users who will pass
	//	if both, only check results for signature one's
	//launch prompt with either
	//If sig, then next button will be to generate PDF
	//If not sig, then next button will be to submit
	var bolNextOk = true;
	var strMessage = '';
	var arrAttendees = [];
	var arrAttendeesMissingScore = [];

	//make sure training is selected and date/time entered
	if((strLOID == '') || (strLOID == null)) {
		bolNextOk = false;
		strMessage = objECLocalization.data["xCNoTrainingErrorMessage"];
	} else {
		objExpressClass.objectId = strLOID;
	}
	if((document.getElementById('dateCompleted').value == '') || (document.getElementById('timeCompleted').value == '')) {
		bolNextOk = false;
		strMessage = objECLocalization.data["xCInvalidDateErrorMessage"];
	} else {
		var strDate = document.getElementById('dateCompleted').value;

		var strDateFormat = dateFormat(strCulture);
		if(strDateFormat == 'mm/dd/yyyy') {
			if(validateDateUS(strDate)) {
				var arrDate = strDate.split('/');
				if(arrDate[0].length == 1) { arrDate[0] = "0" + arrDate[0]; }
				if(arrDate[1].length == 1) { arrDate[1] = "0" + arrDate[1]; }
				strDate = arrDate[2] + "-" + arrDate[0] + "-" + arrDate[1];
			} else {
				bolNextOk = false;
  				strMessage = objECLocalization.data["xCInvalidDateErrorMessage"] + "<br>(" + strDateFormat + ")";
			}
		} else if (strDateFormat == 'dd/mm/yyyy') {
			if(validateDateNonUS(strDate)) {
				var arrDate = strDate.split('/');
				if(arrDate[0].length == 1) { arrDate[0] = "0" + arrDate[0]; }
				if(arrDate[1].length == 1) { arrDate[1] = "0" + arrDate[1]; }
				strDate = arrDate[2] + "-" + arrDate[1] + "-" + arrDate[0];
			} else {
				bolNextOk = false;
  				strMessage = objECLocalization.data["xCInvalidDateErrorMessage"] + "<br>(" + strDateFormat + ")";
			}
		} else if (strDateFormat == 'dd.mm.yyyy') {
			var arrDate = strDate.split('.');
			if(arrDate[0].length == 1) { arrDate[0] = "0" + arrDate[0]; }
			if(arrDate[1].length == 1) { arrDate[1] = "0" + arrDate[1]; }
			strDate = arrDate[2] + "-" + arrDate[1] + "-" + arrDate[0];
		} else {
			var arrDate = strDate.split('/');
			if(arrDate[0].length == 1) { arrDate[0] = "0" + arrDate[0]; }
			if(arrDate[1].length == 1) { arrDate[1] = "0" + arrDate[1]; }
			strDate = arrDate[2] + "-" + arrDate[0] + "-" + arrDate[1];
		}
		if(bolNextOk) {
			var strTime = document.getElementById('timeCompleted').value;
			strTime = strTime.substring(strTime.indexOf("T"));
			var strDateTime = strDate + strTime + '.000';
			objExpressClass.completionDate = strDateTime;
			objExpressClass.timezoneId = document.getElementById('timeZoneCompleted').value;

			//Get class datetime object
	  		strtmpDateTime = strDate + strTime + 'Z';
	  		var dateClass = new Date(strtmpDateTime);
			//Calculate offset for UTC
			var elmSelect = document.getElementById('timeZoneCompleted');
			var strTimeZone = elmSelect.options[elmSelect.selectedIndex].text;
	  		var patt = /\(UTC([\+\-]{1})([0-9]+)\:([0-9]{2})/i;
	  		var result = strTimeZone.match(patt);
	  		if(result != null) {
		  		var strOperator = result[1];
		  		var intHours =  parseInt(result[2]);
		  		var intMinutes =  parseInt(result[3]);
	  			//	Perform offset
	  			if(intHours > 0) { intMinutes = intMinutes + intHours * 60; }
		  		if((strOperator == '+') && (intMinutes > 0)) {
		  			dateClassUTC = new Date(dateClass.getTime() - intMinutes*60000);
		  		} else if(intMinutes>0) {
		  			intMinutes = intMinutes - 60;	//For DST. Need better fix.
		  			dateClassUTC = new Date(dateClass.getTime() + intMinutes*60000);
		  		}
		  	} else {
		  		dateClassUTC = dateClass;
		  	}
	  		//	Compare
	  		console.log(dateClassUTC);
	  		console.log(Date.now());
	  		if(dateClassUTC > Date.now()) {
	  			bolNextOk = false;
	  			strMessage = objECLocalization.data["xCSelectedFutureDateErrorMessage"];
	  		}
		}
	}
	objExpressClass.facilitatorUserId = objECPageConfiguration.data[0].user.id;
	var elmsLi = document.querySelectorAll('#attendeesList li');
	if(bolNextOk) {
		objExpressClass.userObservations = [];
		for(i=0; i<elmsLi.length;i++) {
			if(bolInstructorSignature && i == 0 && (elmsLi[i].querySelector("span[data-field='sigStatus']").innerHTML == objECLocalization.data["No"])) {
				strMessage = objCustomLocalization.data["Instructor"] + ' ' + objCustomLocalization.data["Signature"] + ' ' + objECLocalization.data["Incomplete"];
				bolNextOk = false;
			}
			if(bolSignature) {
				if(elmsLi[i].querySelector("span[data-field='sigStatus']").innerHTML == objECLocalization.data["No"]) {
					continue;
				}
			}
			if(bolIndividualScoring) {
				if(bolInstructorSignature && i == 0) {
					elmsLi[i].querySelector("span[data-field='result']").innerHTML = objECLocalization.data["Complete"];
					elmsLi[i].querySelector("span[data-field='score']").innerHTML = 0;
				} else if((elmsLi[i].querySelector("span[data-field='status']").innerHTML == '') || (elmsLi[i].querySelector("span[data-field='score']").innerHTML == objECLocalization.data["NotApplicable"])) {
					arrAttendeesMissingScore.push(elmsLi[i].querySelector("span[data-field='fullName']").innerHTML);
					bolNextOk = false;
					continue;
				}
			}
			arrAttendees.push(elmsLi[i].querySelector("span[data-field='fullName']").innerHTML);
			var objTmp = {};

			objTmp.userId = parseInt(elmsLi[i].getAttribute('data-id'));
			if(bolIndividualScoring) {
				objTmp.comment= elmsLi[i].querySelector("span[data-field='comments']").innerHTML;
				objTmp.score = elmsLi[i].querySelector("span[data-field='score']").innerHTML;
				if(elmsLi[i].querySelector("span[data-field='result']").innerHTML == objECLocalization.data["Complete"]) {
					objTmp.status = "Passed";
				} else if(elmsLi[i].querySelector("span[data-field='result']").innerHTML == objECLocalization.data["Incomplete"]) {
					objTmp.status = 'Incomplete';
				 }else if(elmsLi[i].querySelector("span[data-field='result']").innerHTML == objECLocalization.data["Fail"]) {
					objTmp.status = 'Fail';
				}
			} else {
				objTmp.status = "Passed";
			}
			if(bolSignature) {
				//Nothing, will add that in later.
			} else if (elmsLi[i].querySelector("span[data-field='attachmentID']").innerHTML != '') {
				objTmp.attachmentId = elmsLi[i].querySelector("span[data-field='attachmentID']").innerHTML;
			}
			objExpressClass.userObservations.push(objTmp);
		}

		if(arrAttendeesMissingScore.length > 0) {
			strMessage = objECLocalization.data["xCAttendeesStatusError"] + "<ul style='text-align:left;'>";
			for(i=0;i<arrAttendeesMissingScore.length;i++) {
				strMessage = strMessage + "<li>" + arrAttendeesMissingScore[i] + "</li>";
			}
			strMessage = strMessage + "</ul>";
		}
		if((arrAttendees.length == 0) && (arrAttendeesMissingScore.length == 0)) {
			bolNextOk = false;
			strMessage = objECLocalization.data["xCAttendeesEmptyError"];
		}
		if(bolNextOk) {
			strMessage = objECLocalization.data["Attendees"] + ": <ul style='text-align:left;'>";
			for(i=0;i<arrAttendees.length;i++) {
				strMessage = strMessage + "<li>" + arrAttendees[i] + "</li>";
			}
			strMessage = strMessage + "</ul>";
		}
	}
	document.getElementById('modalAlert').style.display = 'flex';
	if(!bolNextOk) {
		document.getElementById('alertDisplay').innerHTML = '<i class="p-icon p-icon-alert-triangle p-f-sz-4x p-t-error50"></i>';
		document.getElementById('alertDisplay').style.display = 'block';
		document.getElementById('alertClose').onclick = function(){	closeAlert();	};
		document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Close"];
		document.getElementById('alertConfirm').style.display = 'none';
		document.getElementById('alertMessage').innerHTML = strMessage;
	} else {
		document.getElementById('alertConfirm').style.display = 'inline-block';
		document.getElementById('alertDisplay').style.display = 'none';
		document.getElementById('alertMessage').innerHTML = strMessage;
		document.getElementById('alertClose').onclick = function(){	closeAlert();	};
		document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Cancel"];
		document.querySelector('#alertConfirm span').innerHTML = objECLocalization.data["Submit"];
		if(bolSignature) {
			document.getElementById('alertConfirm').onclick = function(){	generatePDFStart();	};
		} else {
			document.getElementById('alertConfirm').onclick = function(){	submitRoster();	};
		}
	}
}

function validateDateUS(testdate) {
    var date_regex = /^([1-9]|0[1-9]|1[0-2])\/([1-9]|0[1-9]|1\d|2\d|3[01])\/(19|20)\d{2}$/ ;
    return date_regex.test(testdate);
}

function validateDateNonUS(testdate) {
    var date_regex = /^([1-9]|0[1-9]|1\d|2\d|3[01])\/([1-9]|0[1-9]|1[0-2])\/(19|20)\d{2}$/ ;
    return date_regex.test(testdate);
}

function submitRoster() {

	document.getElementById('alertConfirm').style.display = 'none';
	document.getElementById('alertMessage').innerHTML = objCustomLocalization.data["Saving Express Class"];

	var strURL = strAPIPath + 'lms-express-class/v1/ExpressClass';

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var objResultStatus = JSON.parse(xhr.responseText);
			if(objResultStatus.status == 'Success') {
				document.getElementById('alertMessage').innerHTML = objECLocalization.data["Success!"] + '<br><br>' + objECLocalization.data["xCSubmitText"] + ' <br>' + document.getElementById('selectedTrainingTitle').title;
				document.getElementById('alertDisplay').innerHTML = '<i class="p-icon p-icon-checkmark p-f-sz-4x p-t-success50"></i>';
				document.getElementById('alertDisplay').style.display = 'block';
				document.getElementById('alertConfirm').style.display = 'none';
				document.getElementById('alertClose').style.display = 'inline-block';
				window.onbeforeunload = "";
				document.getElementById('alertClose').onclick = function(){	closePage();	};
				document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Close"];
			} else {
				var strMessage = objECLocalization.data["xCSubmitErrorText"] + '<br><br>';
				if(('error' in objResultStatus) && ('message' in objResultStatus.error)) {
					strMessage = strMessage + objResultStatus.error.messsage;
				} else {
					strMessage = strMessage + xhr.responseText;
				}
				document.getElementById('alertMessage').innerHTML = strMessage;
				document.getElementById('alertDisplay').innerHTML = '<i class="p-icon p-icon-alert-triangle p-f-sz-4x p-t-error50"></i>';
				document.getElementById('alertDisplay').style.display = 'block';
				document.getElementById('alertConfirm').style.display = 'inline-block';
				document.querySelector('#alertConfirm span').innerHTML = objECLocalization.data["Submit"];
				document.getElementById('alertConfirm').onclick = function(){	submitRoster();	};
				document.getElementById('alertClose').style.display = 'inline-block';
				document.getElementById('alertClose').onclick = function(){	closeAlert();	};
				document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Close"];
			}
    		} else if (xhr.readyState == 4 && xhr.status == 400) {
    				var strJSON = xhr.responseText.replace(/\\\"/g, "");
    				console.log(strJSON);
    				var objResultStatus = JSON.parse(strJSON);
				var strMessage = objECLocalization.data["xCSubmitErrorText"] + '<br><br>';
				if(('error' in objResultStatus) && ('message' in objResultStatus.error)) {
					strMessage = strMessage + objResultStatus.error.message;
				} else {
					strMessage = strMessage + xhr.responseText;
				}
				document.getElementById('alertMessage').innerHTML = strMessage;
				document.getElementById('alertDisplay').innerHTML = '<i class="p-icon p-icon-alert-triangle p-f-sz-4x p-t-error50"></i>';
				document.getElementById('alertDisplay').style.display = 'block';
				document.getElementById('alertConfirm').style.display = 'inline-block';
				document.querySelector('#alertConfirm span').innerHTML = objECLocalization.data["Submit"];
				document.getElementById('alertConfirm').onclick = function(){	submitRoster();	};
				document.getElementById('alertClose').style.display = 'inline-block';
				document.getElementById('alertClose').onclick = function(){	closeAlert();	};
				document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Close"];
    		} else if (xhr.readyState == 4 && xhr.status != 200) {
				strMessage = objECLocalization.data["xCSubmitErrorText"] + ' Please try to submit again.';
				document.getElementById('alertMessage').innerHTML = strMessage;
				document.getElementById('alertDisplay').innerHTML = '<i class="p-icon p-icon-alert-triangle p-f-sz-4x p-t-error50"></i>';
				document.getElementById('alertDisplay').style.display = 'block';
				document.getElementById('alertConfirm').style.display = 'inline-block';
				document.querySelector('#alertConfirm span').innerHTML = objECLocalization.data["Submit"];
				document.getElementById('alertConfirm').onclick = function(){	submitRoster();	};
				document.getElementById('alertClose').style.display = 'inline-block';
				document.getElementById('alertClose').onclick = function(){	closeAlert();	};
				document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Close"];
    		}
  	};
	xhr.open("POST", strURL, true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	strExpressClass = JSON.stringify(objExpressClass);
	xhr.send(strExpressClass);
}

function closePage() {
	window.location.assign(window.location.href);
}


function closeAlert() {
	document.getElementById('modalAlert').style.display = 'none';
}
function generatePDFStart() {
	generatePDF(0);
}

function generatePDF(startingInt) {
	startingInt = startingInt || 0;
	if((bolInstructorSignature) && (startingInt == 0)) {
		startingInt = 1;
	}
	document.getElementById('alertConfirm').style.display = 'none';
	document.getElementById('alertMessage').innerHTML = objCustomLocalization.data["Generating PDF"];

	var intSignatureColumn = 2;
	if(bolIndividualScoring) {
		intSignatureColumn = 4;
		var elmScore = document.createElement("th");
		elmScore.innerHTML = objECLocalization.data["Score"];
		document.getElementById('pdfTableHeaderRow').insertBefore(elmScore,document.getElementById('pdfTableSignature'));

		var elmResult = document.createElement("th");
		elmResult.innerHTML = objECLocalization.data["Result"];
		document.getElementById('pdfTableHeaderRow').insertBefore(elmResult,document.getElementById('pdfTableSignature'));

	}

	var elmTBody = document.getElementById('pdfTableBody');
	elmTBody.innerHTML = '';
	var elmsLi = document.querySelectorAll('#attendeesList li');
	var arrUserSigIDs = [];

	//Add in instructor each time
	if(bolInstructorSignature) {
		i = 0;
		if(elmsLi[i].querySelector("span[data-field='sigStatus']").innerHTML == 'Signed') {
			var elmTR = document.createElement("tr");
			var elmTDUser = document.createElement("td");
			elmTDUser.innerHTML = elmsLi[i].querySelector("span[data-field='username']").innerHTML;
			elmTR.appendChild(elmTDUser);
			var elmTDName = document.createElement("td");
			elmTDName.innerHTML = elmsLi[i].querySelector("span[data-field='fullName']").innerHTML + '<br>(' + objCustomLocalization.data["Instructor"] + ')';
			elmTR.appendChild(elmTDName);
			if(bolIndividualScoring) {
				var elmTDScore = document.createElement("td");
				elmTDScore.innerHTML = elmsLi[i].querySelector("span[data-field='score']").innerHTML;
				elmTR.appendChild(elmTDScore);
				var elmTDResult = document.createElement("td");
				elmTDResult.innerHTML = elmsLi[i].querySelector("span[data-field='result']").innerHTML;
				elmTR.appendChild(elmTDResult);
			}
			var elmTDImage = document.createElement("td");
			var elmImage = document.createElement("img");
			elmImage.src = elmsLi[i].querySelector("img[data-field='sigImage']").src;
			elmTDImage.appendChild(elmImage);
			elmTR.appendChild(elmTDImage);
			elmTBody.appendChild(elmTR);
			arrUserSigIDs.push(parseInt(elmsLi[i].getAttribute('data-id')));
		}
	}


	var endingInt;
	var intMax = startingInt + intMaxPerFile;
	for(i=startingInt; i<elmsLi.length && arrUserSigIDs.length < intMax;i++) {
		if(elmsLi[i].querySelector("span[data-field='sigStatus']").innerHTML == 'Signed') {
			var elmTR = document.createElement("tr");
			var elmTDUser = document.createElement("td");
			elmTDUser.innerHTML = elmsLi[i].querySelector("span[data-field='username']").innerHTML;
			elmTR.appendChild(elmTDUser);
			var elmTDName = document.createElement("td");
			elmTDName.innerHTML = elmsLi[i].querySelector("span[data-field='fullName']").innerHTML;
			elmTR.appendChild(elmTDName);
			if(bolIndividualScoring) {
				var elmTDScore = document.createElement("td");
				elmTDScore.innerHTML = elmsLi[i].querySelector("span[data-field='score']").innerHTML;
				elmTR.appendChild(elmTDScore);
				var elmTDResult = document.createElement("td");
				elmTDResult.innerHTML = elmsLi[i].querySelector("span[data-field='result']").innerHTML;
				elmTR.appendChild(elmTDResult);
			}
			var elmTDImage = document.createElement("td");
			var elmImage = document.createElement("img");
			elmImage.src = elmsLi[i].querySelector("img[data-field='sigImage']").src;
			elmTDImage.appendChild(elmImage);
			elmTR.appendChild(elmTDImage);
			elmTBody.appendChild(elmTR);
			arrUserSigIDs.push(parseInt(elmsLi[i].getAttribute('data-id')));
			endingInt = i;
		}
	}
	if(endingInt == (elmsLi.length-1)) {
		endingInt = 0;
	}

	doc = new jsPDF();

	doc.setFontStyle("bold");
	doc.setFontSize(20);
	var splitTitle = doc.splitTextToSize(document.getElementById('selectedTrainingTitle').innerHTML, 160);
	doc.text(splitTitle, 20, 20);
	var strTime = document.getElementById('timeCompleted').value
	strTime = strTime.substring(strTime.indexOf('T')+1);
	doc.setFontStyle("normal");
	doc.setFontSize(14);
	doc.text(objCustomLocalization.data["Date Completed"] + ': ' + document.getElementById('dateCompleted').value + ' ' + strTime ,20,45);
	doc.text(objCustomLocalization.data["Instructor"] + ': ' + objECPageConfiguration.data[0].user.firstName + ' ' + objECPageConfiguration.data[0].user.lastName + ' (' + objECPageConfiguration.data[0].user.userName + ')'  ,20,50);
	doc.setFontStyle("bold");
	doc.text(objCustomLocalization.data["Signature Statement"] + ': ',20,60);
	doc.setFontSize(12);
	doc.setFontStyle("normal");
	var splitTitle = doc.splitTextToSize(strSignatureStatement, 160);
	doc.text(splitTitle, 20, 65);
	doc.autoTable({
		html: '#pdfTable',
		theme: 'grid',
		startY: 75,
		bodyStyles: {minCellHeight: 15},
		didDrawCell: function(data) {
			if (data.column.index == intSignatureColumn && data.cell.section === 'body') {
				var td = data.cell.raw;
				var img = td.getElementsByTagName('img')[0];
				var dim = data.cell.height - data.cell.padding('vertical');
				var dimW = dim * 2.57;
				var textPos = data.cell.textPos;
				doc.addImage(img.src, textPos.x,  textPos.y, dimW, dim);
			}
		}
	});
	//doc.save("table.pdf");
	sendPDF(arrUserSigIDs,endingInt);
}

function sendPDF(arrUserSigIDs,endingInt) {
	arrUserSigIDs = arrUserSigIDs || [];
	endingInt = endingInt || 0;
	var strURL = strAPIPath + 'lms-express-class/v1/ExpressClass/AttendeeFile';
	var formData = new FormData();
	var tmpObjSettings = {};
	tmpObjSettings.filename = 'SignatureFile.pdf';
	try {
		var pdf = doc.output('blob',tmpObjSettings);
	}
	catch(err) {
		console.log(err);
		strMessage = objECLocalization.data["xCSubmitErrorText"] + ' (' + objECLocalization.data["Generating PDF"]+ '). ' + objECLocalization.data["Please Try Again"];
		strMessage = strMessage + err.message;
		document.getElementById('alertMessage').innerHTML = strMessage;
		document.getElementById('alertDisplay').innerHTML = '<i class="p-icon p-icon-alert-triangle p-f-sz-4x p-t-error50"></i>';
		document.getElementById('alertDisplay').style.display = 'block';
		document.getElementById('alertConfirm').style.display = 'inline-block';
		document.querySelector('#alertConfirm span').innerHTML = objECLocalization.data["Submit"];
		document.getElementById('alertConfirm').onclick = function(){	sendPDF(arrUserSigIDs,endingInt);	};
		document.getElementById('alertClose').style.display = 'inline-block';
		document.getElementById('alertClose').onclick = function(){	closeAlert();	};
		document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Close"];
	}

	//Update to a message about sending the PDF
	document.getElementById('alertMessage').innerHTML = objCustomLocalization.data["Sending PDF"];

	formData.append('attendeeFile', pdf,'SignatureFile.pdf');
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var objFileResults = JSON.parse(xhr.responseText);
			if(objFileResults.status == 'Success') {
		        	strFileID = objFileResults.data.attachmentId;
		        	for(i=0;i<objExpressClass.userObservations.length;i++) {
		        		if(arrUserSigIDs.includes(parseInt(objExpressClass.userObservations[i].userId))) {
			        		objExpressClass.userObservations[i].attachmentId = strFileID;
			        	}
		        	}
		        	if(endingInt == 0) {
			        	submitRoster();
			        } else {
			        	endingInt = parseInt(parseInt(endingInt) + 1);
			        	generatePDF(endingInt);
			        }
		        } else {
		        	strMessage = objECLocalization.data["xCSubmitErrorText"] + ' (' + objECLocalization.data["Sending PDF"]+ '). ' + objECLocalization.data["Please Try Again"];
		        	strMessage = strMessage + xhr.responseText;
				document.getElementById('alertMessage').innerHTML = strMessage;
				document.getElementById('alertDisplay').innerHTML = '<i class="p-icon p-icon-alert-triangle p-f-sz-4x p-t-error50"></i>';
				document.getElementById('alertDisplay').style.display = 'block';
				document.getElementById('alertConfirm').style.display = 'inline-block';
				document.querySelector('#alertConfirm span').innerHTML = objECLocalization.data["Submit"];
				document.getElementById('alertConfirm').onclick = function(){	sendPDF(arrUserSigIDs,endingInt);	};
				document.getElementById('alertClose').style.display = 'inline-block';
				document.getElementById('alertClose').onclick = function(){	closeAlert();	};
				document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Close"];
		        }
    		} else if (xhr.readyState == 4 && xhr.status != 200) {
	    		strMessage = objECLocalization.data["xCSubmitErrorText"] + ' (' + objECLocalization.data["Sending PDF"]+ '). ' + objECLocalization.data["Please Try Again"];
			document.getElementById('alertMessage').innerHTML = strMessage;
			document.getElementById('alertDisplay').innerHTML = '<i class="p-icon p-icon-alert-triangle p-f-sz-4x p-t-error50"></i>';
			document.getElementById('alertDisplay').style.display = 'block';
			document.getElementById('alertConfirm').style.display = 'inline-block';
			document.querySelector('#alertConfirm span').innerHTML = objECLocalization.data["Submit"];
			document.getElementById('alertConfirm').onclick = function(){	sendPDF(arrUserSigIDs,endingInt);	};
			document.getElementById('alertClose').style.display = 'inline-block';
			document.getElementById('alertClose').onclick = function(){	closeAlert();	};
			document.querySelector('#alertClose span').innerHTML = objECLocalization.data["Close"];
    		}
  	};
	xhr.open("POST", strURL, true);
	xhr.setRequestHeader('Authorization', 'Bearer ' + strToken);
	xhr.setRequestHeader('csod-accept-language', 'en-US');
	xhr.send(formData);
}

//IE 11 Support for array.includes()
if (![].includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
    'use strict';
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) {
        return true;
      }
      k++;
    }
    return false;
  };
}


function objectValues(obj) {
    var res = [];
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            res.push(obj[i]);
        }
    }
    return res;
}

function dateFormat(language) {
  const sample = window.Intl ? new Intl.DateTimeFormat(language).format(new Date(1970, 11, 31)) : '';

  let mm = 0,
      mi = sample.indexOf(12);
  let dd = 1,
      di = sample.indexOf(31);
  let yy = 2,
      yi = sample.indexOf(1970);

  // IE 10 or earlier, iOS 9 or earlier, non-Latin numbering system
  // or non-Gregorian calendar; fall back to mm/dd/yyyy
  if (yi >= 0 && mi >= 0 && di >= 0) {
    mm = (mi > yi) + (mi > di);
    dd = (di > yi) + (di > mi);
    yy = (yi > mi) + (yi > di);
  }

  let r = [];
  r[yy] = 'yyyy';
  r[mm] = 'mm';
  r[dd] = 'dd';

  return r.join(sample.match(/[-.]/) || '/');
}
