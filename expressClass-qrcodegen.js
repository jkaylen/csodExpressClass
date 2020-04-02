
function initQRCode() {
	strLEPURL = "/ui/lms-learner-home/home";
	var xhrLEP = new XMLHttpRequest();
	xhrLEP.onreadystatechange = function() {
		if (xhrLEP.readyState == 4 && xhrLEP.status == 200) {	//LEP loaded, now we pull out token and user and call the correct service
			strLEP = xhrLEP.responseText;
			if(strLEP.includes("Restricted Access")) {
				document.getElementById('txtClose').addEventListener("click", closeAttendee);
				document.getElementById('modalAccess').style.display = "flex";
			} else {
				strUserNumber = strLEP.substring(strLEP.indexOf('"user":')+7,strLEP.indexOf(",",strLEP.indexOf('"user"')));
				var strName = document.getElementById("divName").innerHTML;
				var dt = new Date();
				var strDate = dt.toUTCString();
				strQRCode = strName + "|" + strUserNumber;
				var QRC = qrcodegen.QrCode;
				var qr0 = QRC.encodeText(strQRCode, QRC.Ecc.MEDIUM);
				console.log(strQRCode);
				//new QRCode(document.getElementById("qrcode"), strQRCode);
				//new QRCode(document.getElementById("qrcode"), { 'text': strQRCode ,'correctLevel': QRCode.CorrectLevel.L});
				qr0.drawCanvas(8,2,document.getElementById('qrCodeCanvas'));
			}
		}
	};
	xhrLEP.open("POST", strLEPURL, true);
	xhrLEP.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhrLEP.send();
}

function closeAttendee() {
	window.location.assign('/LMS/catalog/Main.aspx?tab_page_id=-67');
}