"use strict"

// Input Fields
const studentName = document.getElementById("student-name-field");
const courseName = document.getElementById("course-name-field");
const instructorName = document.getElementById("instructor-name-field");
const website = document.getElementById("website-field");
const signatureImage = document.getElementById("signature-image-field");
const serial = document.getElementById("certificate-serial-field");

// Cert Parts
const certStudentName = document.getElementById("certificate-student-name");
const certCourseName = document.getElementById("certificate-main-course-name");
const certInstructorName = document.getElementById("instructor-name");
const certWebsite = document.getElementById("website");
const certSignatureImage = document.getElementById("signature");
const certIssuedDate = document.getElementById("issued-date");
const certSerial = document.getElementById("certificate-serial");

// Buttons - Status lines
const printBtn = document.getElementById("print-button");
const resetBtn = document.getElementById("reset-button");
const fillDemoBtn = document.getElementById("fill-demo-button");
const statusLine = document.getElementById("status-line");
const certStatusLine = document.getElementById("cert-status-line");


// Set Today's Date and update it at Midnight
function updateDate(){
    const todayDate = new Date();
    certIssuedDate.textContent = `${todayDate.getDate()}-${todayDate.getMonth() + 1}-${todayDate.getFullYear()}`;

    const midnightDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1, 0, 0, 0, 0);

    const remainingTimeUntilMidnight = midnightDate.getTime() - todayDate.getTime();

    setTimeout(updateDate, remainingTimeUntilMidnight);
}

updateDate();


// Validation
function validateText(value, min = 3){
    return value.trim().length >= min;
}

function validateWebsite(value){
    return /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/.*)?$/.test(value.trim());
}

function validateSerial(value){
    const v = value.trim();
    if (v.length <= 6) return false;
    return /^[A-Za-z0-9-]+$/.test(v);
}

function validateSignature(fileObject){
    const file = fileObject.files && fileObject.files[0];
    return !!file;
}



function setInputValidation(input, isValid){
    const parent = input.closest("div");
    parent.classList.toggle("invalid", !isValid);
}



function updateCertificate(){
    certStudentName.textContent = studentName.value.trim() || "Student Name";
    certCourseName.textContent = courseName.value.trim() || "Course Name Goes Here";
    certInstructorName.textContent = instructorName.value.trim() || "Instructor Name Goes Here";
    certWebsite.textContent = website.value.trim() || "www.website.com";
    certSerial.textContent = serial.value.trim() || "-";
}


// Update Signature Image and insure no memory leaks
let signatureObjectURL = null;
function updateSignatureImage(){
    const file = signatureImage.files && signatureImage.files[0];

    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) return;

    if (signatureObjectURL){
        URL.revokeObjectURL(signatureObjectURL);
        signatureObjectURL = null;
    }

    signatureObjectURL = URL.createObjectURL(file);
    signature.src = signatureObjectURL;
}


// Validate all, Control red highlights, Control error texts and status lines visiability and content
function validateAll(){
    const nameOK = validateText(studentName.value);
    const courseOK = validateText(courseName.value, 6);
    const instructorOK = validateText(instructorName.value);
    const websiteOK = validateWebsite(website.value);
    const signatureOK = validateSignature(signatureImage);
    const serialOK = validateSerial(serial.value);

    setInputValidation(studentName, nameOK);
    setInputValidation(courseName, courseOK);
    setInputValidation(instructorName, instructorOK);
    setInputValidation(website, websiteOK);
    setInputValidation(signatureImage, signatureOK);
    setInputValidation(serial, serialOK);

    const allOK = nameOK && courseOK && instructorOK && websiteOK && signatureOK && serialOK;

    printBtn.disabled = !allOK;
    printBtn.classList.toggle("disabled", !allOK);

    if (allOK){
        statusLine.classList.add("hidden");
        certStatusLine.classList.remove("not");
        certStatusLine.textContent = "Ready to print";
    }else{
        statusLine.classList.remove("hidden");
        certStatusLine.classList.add("not");
        certStatusLine.textContent = "Not ready to print";
    }

    return allOK;
}


function onInputChange(){
    updateCertificate();
    validateAll();
}    

// Add event listners
[studentName, courseName, instructorName, website, serial].forEach((el) => {
    el.addEventListener("input", onInputChange);
});

signatureImage.addEventListener("change", () => {
    updateSignatureImage();
    validateAll();

});

printBtn.addEventListener("click", () => {
    if (!validateAll()) return;
    window.print();
})

resetBtn.addEventListener("click", () => {
    studentName.value = "";
    courseName.value = "";
    instructorName.value = "";
    website.value = "";
    serial.value = "";
    signatureImage.value = "";

    if (signatureObjectURL){
        URL.revokeObjectURL(signatureObjectURL);
        signatureObjectURL = null;
    }

    certSignatureImage.src = "media/DefaultSig.png";

    onInputChange();
})

fillDemoBtn.addEventListener("click", () => {
    studentName.value = "Mahmoud Ayesh";
    courseName.value = "C# Level 2";
    instructorName.value = "Dr. Mohammed Abu-Hadhoud";
    website.value = "www.programmingadvices.com";
    serial.value = "MD-2025-000123";

    onInputChange();
})

onInputChange();