# CSOD: Express Class Extension
The Express Class Extension runs on the Cornerstone platform as two custom pages that utilize Cornerstone micro-services to extend Express Class Functionality. The two primary areas of functionality are the allowing of QR Code scanning for attendance and capturing traced signatures in a PDF file that is automatically uploaded as an observation associated with the selected Express Class on each learner’s transcript. The Extension works on desktops and mobile devices and QR Code functionality utilizes the device’s camera, including laptop webcams.
# Hosting
**Non-Cornerstone demo portals should host the files on an https server that is accessible to users of their Cornerstone Portal**. The files that need to be hosted are:
-	expressClass.css
-	expressClass.js
-	expressClass-qrcodegen.js
-	instascan.min.js (open source package, MIT license)
-	jspdf.min.js (open source package, MIT license)
-	jspdf.plugin.autotable.js (open source package, MIT license)
-	jsQR.js (open source package, MIT license)
-	qrcodegen.js (open source package, MIT license)
-	signature_pad.min.js (open source package, MIT license)
-	translations/*.txt
# Limitations
-	Javascript must be enabled on the client portal
-	A new course cannot be created from the Express Class Extension
-	If Participants are using the Log Attendance page to generate their QR code, they must have access to Learner Home
-	Not part of the Cornerstone core product, could break with any update to micro-services
-	QR Codes must match the format in this document
# Portal Setup
The following must be enabled/configured on your portal:
-	Javascript must be enabled. This will require a sign-off for Cornerstone to do.
-	The files referenced in the hosting section must be hosted by the partner or client, as this is not core Cornerstone product
-	Permissions:
  - Instructors must have Express Class permission
  - Attendees using the Log Attendance custom page must have Learner Home permission
-	Create the two custom pages below, making sure to update the include paths to point to the client/partner hosting. Also update the TranslationsURL parameter
-	Add the Custom Pages to Navigation Tabs & Links for instructors and attendees, respectively
# Custom Pages
The Express Class Extension custom page is required, and there is an optional attendee custom page (Log Attendance) if attendee’s will be displaying a QR code on their phone for attendance rather than using a pre-printed QR code.
## Express Class Extension Custom Page
Add a custom page with 1 Column, No Header, No Footer. Add an HTML Widget and copy the html from https://scfiles.csod.com/labs/expressClass/ExpressClass.html. Suggested name is ‘Express Class Extension’. Make sure to copy the HTML into any language that is required. This is the page that will be used instead of the standard Express Class page. There are configuration options at the top of the page, in HTML. Additionally, update the path to include files in the header of the HTML file.
-**RecordUserScores: true; false**
Specifies if instructor must mark a status (Complete, Incomplete, Fail) and an optional score and comments. If marked false, any learner added to the attendee list (and providing a signature, if signatures are on) will be added to the course as completed.

-**Signature: true; false**
Specifies if the trace signature option is on. Only those learners who sign will be marked as completed, even if other names are on the attendee list. A single PDF file is generated with names and copies of the signatures.

-**SignatureMessage: string**
This is the string of text that appears above the signature box and on the PDF

-**SignatureWatermark: true; false**
If true, all signatures saved to the PDF will contain the date and title of the course superimposed on the signature image. This is to prevent the signature being used on other documentions.

-**InstructorSignature: true; false**
Specifies if the instructor is required to sign as a participant as well. If multiple PDF files are generated (# of participants > MaxSignaturePerFile), then the instructor signature will be on each. Useful if you would like the instructor to have a copy of all the signature files in their transcript. Value ignored if Signature is false.

-**MaxSignaturePerFile: int **
The maximum number of signatures to include in each PDF, up to 50. Put 1 to have a single file per participant.

-**MatchQRCodeBy: id; userRef; userName**
Specifies the format of the QR code (FirstName LastName|<MatchQRCodeBy>). If using the Log Attendance page this option must be id. If using pre-printed QR codes, it is best to use userRef or userName, as id refers to an internal Cornerstone ID.

-**TranslationsURL: string**
The path to any translation files, one file for each language you need supported.

## Log Attendance Custom Page
Add a custom page with 1 Column, No Header, No Footer. Add an HTML Widget and copy the html from https://scfiles.csod.com/labs/expressClass/ExpressClass-Attendee.html. This is the page that learners will use for marking attendance. Update the path to include files in the header.

# Translations
The majority of the text is system standard text, translated by Cornerstone. The text referring to QR Codes and Signatures has been translated into English and will default to English is the absence of any other translations. To add translated text, find the file translations/en-US.txt and copy it, renaming it to the correct language code, ie es-MX.txt. Edit the file, replacing the English translations.

# Usage
The majority of functionality matches the Cornerstone standard Express Class functionality. This includes the requirement for the instructor to pick a Learning Object, date, time, and timezone. The Learning Objects available to the instructor are based off of the Express Class permission/constraint. The date/time must be in the past, the same restrictions as the standard Express Class has. Information on QR Codes, Signatures, and Instructor Mode/Participant Mode are below.

## Pre-Printed QR Codes
QR codes may be pre-printed on stickers and/or as part of employee ID badges, following the format outlined below. The setting at the top of the Instructor page, MatchQRCodeBy, controls which format the system is expecting.

- **userName**: John Smith|jsmith
- **userRef**: John Smith|E100234

## Log Attendance QR Codes
Instead of using pre-printed QR Codes, attendees may log into CSOD on their own mobile device and open the Log Attendance custom page, which displays a QR Code that the instructor can then scan. For this option to work the MatchQRCodeBy value must be id.

## Signatures
Learners may trace their signature using a mouse or their finger on devices with a touchscreen. The signature is then stored as a PDF containing a table of all learners and attached to each of their transcript records as an Observation under Learning Details for the LO that was selected by the instructor. If the Signature option is enabled on the Instructor Custom Page, the instructor can change the Mode to Participant Mode (see below) and a Sign button appears next to each learner’s name. If QR code scanning is used, the signature prompt appears as each learner’s QR code is scanned. Learners are not saved to the Express Class record without a signature, even if the instructor marks them as Complete.

## Instructor/Participant Mode
A toggle switch under the course details is available to turn Instructor Mode On and Off. When Instructor Mode is off, the menu is hidden, the option to change Learning Details is locked, and the option to record results & scores is disabled. Participants may only Sign. Note that a participant could still navigate away from the page by changing the URL of the browser and/or open another app. When Instructor Mode is turned back on, functionality is restored and the Sign button changes to Record if RecordUserScores is set to true.
