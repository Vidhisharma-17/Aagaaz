const API_BASE_URL = "http://127.0.0.1:8000";

const queryParameters =
    new URLSearchParams(window.location.search);

const jobId =
    queryParameters.get("job_id");

const applicationId =
    queryParameters.get("application_id");


const submissionForm =
    document.getElementById("submissionForm");

const cleanupImage =
    document.getElementById("cleanupImage");

const imagePreviewContainer =
    document.getElementById("imagePreviewContainer");

const imagePreview =
    document.getElementById("imagePreview");

const submissionMessage =
    document.getElementById("submissionMessage");

const submitEvidenceButton =
    document.getElementById("submitEvidenceButton");

const submissionSuccess =
    document.getElementById("submissionSuccess");

const generateCertificateButton =
    document.getElementById("generateCertificateButton");

const certificateMessage =
    document.getElementById("certificateMessage");


let activeSession = null;
let currentJob = null;
let currentApplication = null;
let uploadedSubmission = null;
let countdownInterval = null;


function setSubmissionMessage(text = "", type = "") {

    submissionMessage.textContent = text;

    submissionMessage.classList.remove(
        "success",
        "error",
        "info"
    );

    if (type) {
        submissionMessage.classList.add(type);
    }
}


function setCertificateMessage(text = "", type = "") {

    certificateMessage.textContent = text;

    certificateMessage.classList.remove(
        "success",
        "error",
        "info"
    );

    if (type) {
        certificateMessage.classList.add(type);
    }
}


async function submissionAuthenticatedFetch(
    endpoint,
    options = {}
) {

    const token = await getAccessToken();

    if (!token) {
        window.location.replace("login.html");
        throw new Error("Authentication required.");
    }


    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,

                headers: {
                    ...(options.headers || {}),

                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


    let result = {};

    try {
        result = await response.json();
    } catch {
        result = {};
    }


    if (!response.ok) {

        const detail = result.detail;

        let message =
            result.message ||
            "Request failed.";

        if (typeof detail === "string") {
            message = detail;
        }

        if (Array.isArray(detail)) {
            message =
                detail
                    .map(item => item.msg)
                    .join(", ");
        }

        throw new Error(message);
    }


    return result;
}


async function loadNavbarUser() {

    const user = activeSession?.user;

    if (!user) {
        return;
    }


    document.getElementById(
        "navbarUserName"
    ).textContent =
        user.user_metadata?.full_name ||
        "EcoVisionAI User";


    document.getElementById(
        "navbarUserEmail"
    ).textContent =
        user.email || "";
}


function formatNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString()
        : "--";
}


function formatReward(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? `₹${number.toLocaleString()}`
        : "--";
}


function formatDateTime(value) {

    if (!value) {
        return "--";
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString();
}


function renderJobInformation(job) {

    const container =
        document.getElementById(
            "jobInformation"
        );


    container.innerHTML = `

        <div class="submission-job-header">

            <div>
                <h3>
                    ${job.event_name || "Cleanup Job"}
                </h3>

                <p>
                    ${job.location || "--"}
                </p>
            </div>

            <span class="submission-job-status">
                ${job.status || "Accepted"}
            </span>

        </div>


        <div class="submission-job-metrics">

            <article>
                <span>Predicted Waste</span>

                <strong>
                    ${formatNumber(job.predicted_waste)}
                    tons
                </strong>
            </article>


            <article>
                <span>Pollution Risk</span>

                <strong>
                    ${job.pollution_risk || "--"}
                </strong>
            </article>


            <article>
                <span>Workers Required</span>

                <strong>
                    ${formatNumber(job.workers_required)}
                </strong>
            </article>

        </div>

    `;


    document.getElementById(
        "expectedReward"
    ).textContent =
        formatReward(
            job.reward_per_worker
        );
}


function startDeadlineCountdown(deadlineValue) {

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }


    const deadline =
        new Date(deadlineValue);


    document.getElementById(
        "deadlineDate"
    ).textContent =
        `Deadline: ${formatDateTime(deadlineValue)}`;


    function updateCountdown() {

        const remaining =
            deadline.getTime() -
            Date.now();


        if (
            Number.isNaN(deadline.getTime())
        ) {

            document.getElementById(
                "deadlineCountdown"
            ).textContent =
                "Deadline unavailable";

            return;
        }


        if (remaining <= 0) {

            document.getElementById(
                "deadlineCountdown"
            ).textContent =
                "Deadline Expired";


            submitEvidenceButton.disabled = true;


            clearInterval(countdownInterval);

            return;
        }


        const hours =
            Math.floor(
                remaining /
                (1000 * 60 * 60)
            );


        const minutes =
            Math.floor(
                (
                    remaining %
                    (1000 * 60 * 60)
                ) /
                (1000 * 60)
            );


        const seconds =
            Math.floor(
                (
                    remaining %
                    (1000 * 60)
                ) /
                1000
            );


        document.getElementById(
            "deadlineCountdown"
        ).textContent =
            `${hours}h ${minutes}m ${seconds}s`;
    }


    updateCountdown();

    countdownInterval =
        setInterval(
            updateCountdown,
            1000
        );
}


async function loadAcceptedJob() {

    if (!jobId) {
        throw new Error(
            "Missing job_id in submission page URL."
        );
    }


    const response =
        await submissionAuthenticatedFetch(
            `/api/jobs/${jobId}`
        );


    currentJob =
        response.data ||
        response.job ||
        response;


    renderJobInformation(currentJob);


    const deadline =
        currentApplication?.submission_deadline ||
        currentJob.deadline;


    if (deadline) {
        startDeadlineCountdown(deadline);
    } else {
        document.getElementById(
            "deadlineCountdown"
        ).textContent =
            "Deadline unavailable";
    }
}


function clearSelectedImage() {

    cleanupImage.value = "";

    imagePreview.src = "";

    imagePreviewContainer.hidden = true;

    document.getElementById(
        "selectedFileName"
    ).textContent = "";

    document.getElementById(
        "selectedFileSize"
    ).textContent = "";
}


function handleImageSelection() {

    const file =
        cleanupImage.files[0];


    if (!file) {
        clearSelectedImage();
        return;
    }


    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (!allowedTypes.includes(file.type)) {

        clearSelectedImage();

        setSubmissionMessage(
            "Please select a JPG, PNG or WEBP image.",
            "error"
        );

        return;
    }


    const maximumSize =
        10 * 1024 * 1024;


    if (file.size > maximumSize) {

        clearSelectedImage();

        setSubmissionMessage(
            "Image size must be less than 10 MB.",
            "error"
        );

        return;
    }


    setSubmissionMessage();


    imagePreview.src =
        URL.createObjectURL(file);


    document.getElementById(
        "selectedFileName"
    ).textContent =
        file.name;


    document.getElementById(
        "selectedFileSize"
    ).textContent =
        `${(
            file.size /
            (1024 * 1024)
        ).toFixed(2)} MB`;


    imagePreviewContainer.hidden = false;
}


async function handleEvidenceSubmission(event) {

    event.preventDefault();


    const file =
        cleanupImage.files[0];


    if (!file) {

        setSubmissionMessage(
            "Select a cleanup image first.",
            "error"
        );

        return;
    }


    if (!jobId) {

        setSubmissionMessage(
            "Job information is missing.",
            "error"
        );

        return;
    }


    setSubmissionMessage(
        "Uploading cleanup evidence...",
        "info"
    );


    submitEvidenceButton.disabled = true;

    submitEvidenceButton.textContent =
        "Submitting Evidence...";


    try {

        const formData =
            new FormData();


        formData.append(
            "file",
            file
        );


        formData.append(
            "job_id",
            jobId
        );


        if (applicationId) {

            formData.append(
                "application_id",
                applicationId
            );
        }


        const response =
            await submissionAuthenticatedFetch(
                "/api/uploads/cleanup-image",
                {
                    method: "POST",
                    body: formData
                }
            );


        uploadedSubmission =
            response.data ||
            response.submission ||
            response;


        setSubmissionMessage(
            response.message ||
            "Cleanup evidence submitted successfully.",
            "success"
        );


        submissionSuccess.hidden = false;


        submissionSuccess.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });


    } catch (error) {

        console.error(
            "Evidence submission error:",
            error
        );


        setSubmissionMessage(
            error.message,
            "error"
        );


    } finally {

        submitEvidenceButton.disabled = false;

        submitEvidenceButton.textContent =
            "Submit Cleanup Evidence";
    }
}


async function generateCertificate() {

    setCertificateMessage(
        "Generating your certificate...",
        "info"
    );


    generateCertificateButton.disabled = true;

    generateCertificateButton.textContent =
        "Generating Certificate...";


    try {

        const submissionId =
            uploadedSubmission?.submission_id ||
            uploadedSubmission?.id ||
            null;


        const payload = {
            job_id: jobId
        };


        if (applicationId) {
            payload.application_id =
                applicationId;
        }


        if (submissionId) {
            payload.submission_id =
                submissionId;
        }


        const response =
            await submissionAuthenticatedFetch(
                "/api/certificates/generate",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        setCertificateMessage(
            response.message ||
            "Certificate generated successfully. Open your dashboard to view it.",
            "success"
        );


        generateCertificateButton.textContent =
            "Certificate Generated";


    } catch (error) {

        console.error(
            "Certificate error:",
            error
        );


        setCertificateMessage(
            error.message,
            "error"
        );


        generateCertificateButton.disabled = false;

        generateCertificateButton.textContent =
            "Generate Certificate";
    }
}


async function initializeSubmissionPage() {

    try {

        activeSession =
            await requireAuthentication();


        if (!activeSession) {
            return;
        }


        await loadNavbarUser();


        await loadAcceptedJob();


    } catch (error) {

        console.error(
            "Submission page initialization error:",
            error
        );


        setSubmissionMessage(
            error.message,
            "error"
        );


        document.getElementById(
            "jobInformation"
        ).innerHTML = `

            <div class="submission-loading">

                ${error.message}

            </div>
        `;
    }
}


cleanupImage.addEventListener(
    "change",
    handleImageSelection
);


document.getElementById(
    "removeImageButton"
).addEventListener(
    "click",
    clearSelectedImage
);


submissionForm.addEventListener(
    "submit",
    handleEvidenceSubmission
);


generateCertificateButton.addEventListener(
    "click",
    generateCertificate
);


document.getElementById(
    "logoutButton"
).addEventListener(
    "click",
    async () => {

        try {
            await logoutUser();
        } catch (error) {
            setSubmissionMessage(
                error.message,
                "error"
            );
        }
    }
);


initializeSubmissionPage();