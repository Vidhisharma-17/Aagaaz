const API_BASE_URL =
    "http://127.0.0.1:8000";


const jobsMessage =
    document.getElementById("jobsMessage");


const availableJobsContainer =
    document.getElementById(
        "availableJobsContainer"
    );


const acceptedJobsContainer =
    document.getElementById(
        "acceptedJobsContainer"
    );


const availableJobsSection =
    document.getElementById(
        "availableJobsSection"
    );


const acceptedJobsSection =
    document.getElementById(
        "acceptedJobsSection"
    );


const jobModal =
    document.getElementById("jobModal");


const modalAcceptButton =
    document.getElementById(
        "modalAcceptButton"
    );


let activeSession = null;
let selectedJobId = null;


function setJobsMessage(
    text = "",
    type = ""
) {

    jobsMessage.textContent = text;

    jobsMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    if (type) {
        jobsMessage.classList.add(type);
    }
}


async function jobsAuthenticatedFetch(
    endpoint,
    options = {}
) {

    const token = await getAccessToken();


    if (!token) {

        window.location.replace(
            "login.html"
        );

        throw new Error(
            "Authentication required."
        );
    }


    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,

                headers: {
                    ...(options.headers || {}),

                    "Authorization":
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


function getArrayFromResponse(
    response,
    possibleKeys = []
) {

    if (Array.isArray(response)) {
        return response;
    }


    for (const key of possibleKeys) {

        if (Array.isArray(response?.[key])) {
            return response[key];
        }
    }


    if (Array.isArray(response?.data)) {
        return response.data;
    }


    return [];
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


    if (!Number.isFinite(number)) {
        return "--";
    }


    return number.toLocaleString();
}


function formatReward(value) {

    const number = Number(value);


    if (!Number.isFinite(number)) {
        return "--";
    }


    return `₹${number.toLocaleString()}`;
}


function formatDateTime(value) {

    if (!value) {
        return "--";
    }


    const date = new Date(value);


    if (Number.isNaN(date.getTime())) {
        return value;
    }


    return date.toLocaleString();
}


function createJobCard(job) {

    const card =
        document.createElement("article");


    card.className = "job-card";


    card.innerHTML = `

        <div class="job-card-top">

            <div>
                <h3>
                    ${job.event_name || "Cleanup Job"}
                </h3>

                <p class="job-location">
                    ${job.location || "--"}
                </p>
            </div>

            <span class="job-risk-badge">
                ${job.pollution_risk || "--"}
            </span>

        </div>


        <div class="job-metrics">

            <article>
                <span>Predicted Waste</span>

                <strong>
                    ${formatNumber(job.predicted_waste)}
                    tons
                </strong>
            </article>


            <article>
                <span>Workers Required</span>

                <strong>
                    ${formatNumber(job.workers_required)}
                </strong>
            </article>


            <article>
                <span>Accepted Workers</span>

                <strong>
                    ${formatNumber(job.accepted_workers)}
                </strong>
            </article>


            <article>
                <span>Reward / Worker</span>

                <strong>
                    ${formatReward(job.reward_per_worker)}
                </strong>
            </article>

        </div>


        <p class="job-address">

            Cleanup Location

            <strong>
                ${job.address || "--"}
            </strong>

        </p>


        <div class="job-card-actions">

            <button
                type="button"
                class="view-job-button"
                data-view-job="${job.id}"
            >
                View Details
            </button>


            <button
                type="button"
                class="accept-job-button"
                data-accept-job="${job.id}"
            >
                Accept Job
            </button>

        </div>

    `;


    return card;
}


function renderAvailableJobs(jobs) {

    availableJobsContainer.innerHTML = "";


    document.getElementById(
        "availableJobsCount"
    ).textContent =
        jobs.length;


    if (!jobs.length) {

        availableJobsContainer.innerHTML = `

            <p class="jobs-empty-state">

                No cleanup jobs are currently available.

            </p>
        `;

        return;
    }


    jobs.forEach(job => {

        availableJobsContainer.appendChild(
            createJobCard(job)
        );
    });
}


async function loadAvailableJobs() {

    availableJobsContainer.innerHTML = `

        <p class="jobs-empty-state">

            Loading available cleanup jobs...

        </p>
    `;


    try {

        const response =
        await jobsAuthenticatedFetch(
            "/api/jobs/available"
     );

        const jobs =
            getArrayFromResponse(
                response,
                ["jobs", "available_jobs"]
            );


        renderAvailableJobs(jobs);


    } catch (error) {

        console.error(
            "Available jobs error:",
            error
        );


        availableJobsContainer.innerHTML = `

            <p class="jobs-empty-state">

                ${error.message}

            </p>
        `;
    }
}


function createAcceptedJobCard(item) {

    const job =
        item.job ||
        item;


    const jobId =
        item.job_id ||
        job.id ||
        "";


    const applicationId =
        item.application_id ||
        item.id ||
        "";


    const deadline =
        item.submission_deadline ||
        item.deadline ||
        job.deadline;


    const status =
        item.status ||
        job.status ||
        "Accepted";


    const card =
        document.createElement("article");


    card.className =
        "accepted-job-card";


    card.innerHTML = `

        <div>

            <strong>
                ${job.event_name || "Cleanup Job"}
            </strong>

            <span>
                ${job.location || "--"}
            </span>

        </div>


        <div>

            <strong>
                ${formatNumber(job.predicted_waste)}
                tons
            </strong>

            <span>
                Predicted Waste
            </span>

        </div>


        <div>

            <strong>
                ${formatReward(job.reward_per_worker)}
            </strong>

            <span>
                Expected Reward
            </span>

        </div>


        <div>

            <strong>
                ${status}
            </strong>

            <span class="deadline-text">
                Deadline:
                ${formatDateTime(deadline)}
            </span>

        </div>


        <a
            href="submission.html?job_id=${encodeURIComponent(jobId)}&application_id=${encodeURIComponent(applicationId)}"
            class="submission-link"
        >
            Submit Work
        </a>

    `;


    return card;
}


async function loadAcceptedJobs() {

    acceptedJobsContainer.innerHTML = `

        <p class="jobs-empty-state">

            Loading your accepted jobs...

        </p>
    `;


    try {

        const response =
            await jobsAuthenticatedFetch(
                "/api/jobs/my-jobs"
            );


        const jobs =
            getArrayFromResponse(
                response,
                [
                    "jobs",
                    "my_jobs",
                    "applications"
                ]
            );


        acceptedJobsContainer.innerHTML = "";


        if (!jobs.length) {

            acceptedJobsContainer.innerHTML = `

                <p class="jobs-empty-state">

                    You have not accepted a cleanup job yet.

                </p>
            `;

            return;
        }


        jobs.forEach(item => {

            acceptedJobsContainer.appendChild(
                createAcceptedJobCard(item)
            );
        });


    } catch (error) {

        console.error(
            "Accepted jobs error:",
            error
        );


        acceptedJobsContainer.innerHTML = `

            <p class="jobs-empty-state">

                ${error.message}

            </p>
        `;
    }
}

async function loadJobDetails(jobId) {

    try {

        const response =
            await jobsAuthenticatedFetch(
                "/api/jobs/available"
            );

        const jobs =
            getArrayFromResponse(
                response,
                ["jobs", "available_jobs"]
            );

        const job =
            jobs.find(
                item =>
                    String(item.id) ===
                    String(jobId)
            );

        if (!job) {
            throw new Error(
                "Cleanup job could not be found."
            );
        }

        selectedJobId = job.id;

        document.getElementById(
            "modalEventName"
        ).textContent =
            job.event_name ||
            "Cleanup Job";

        document.getElementById(
            "modalLocation"
        ).textContent =
            job.location || "--";

        document.getElementById(
            "modalWaste"
        ).textContent =
            `${formatNumber(
                job.predicted_waste
            )} tons`;

        document.getElementById(
            "modalRisk"
        ).textContent =
            job.pollution_risk || "--";

        document.getElementById(
            "modalWorkers"
        ).textContent =
            formatNumber(
                job.workers_required
            );

        document.getElementById(
            "modalReward"
        ).textContent =
            formatReward(
                job.reward_per_worker
            );

        document.getElementById(
            "modalAddress"
        ).textContent =
            job.address || "--";

        document.getElementById(
            "modalDeadline"
        ).textContent =
            `Job deadline: ${
                formatDateTime(job.deadline)
            }`;

        jobModal.hidden = false;

        document.body.style.overflow =
            "hidden";

        setJobsMessage();

    } catch (error) {

        console.error(
            "Job details error:",
            error
        );

        setJobsMessage(
            error.message,
            "error"
        );
    }
}

function closeJobModal() {

    jobModal.hidden = true;

    document.body.style.overflow = "";

    selectedJobId = null;
}


async function acceptJob(jobId) {

    if (!jobId) {
        return;
    }


    setJobsMessage(
        "Accepting cleanup job...",
        "info"
    );


    modalAcceptButton.disabled = true;


    try {

        const response =
            await jobsAuthenticatedFetch(
                "/api/jobs/accept",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        job_id: jobId
                    })
                }
            );


        setJobsMessage(
            response.message ||
            "Cleanup job accepted successfully.",
            "success"
        );


        closeJobModal();


        await Promise.all([
            loadAvailableJobs(),
            loadAcceptedJobs()
        ]);


        showTab("accepted");


    } catch (error) {

        setJobsMessage(
            error.message,
            "error"
        );


    } finally {

        modalAcceptButton.disabled = false;
    }
}


function showTab(tabName) {

    const availableActive =
        tabName === "available";


    availableJobsSection.hidden =
        !availableActive;


    acceptedJobsSection.hidden =
        availableActive;


    document
        .querySelectorAll(".jobs-tab")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.tab === tabName
            );
        });


    if (!availableActive) {
        loadAcceptedJobs();
    }
}


document.addEventListener(
    "click",
    event => {

        const viewButton =
            event.target.closest(
                "[data-view-job]"
            );


        if (viewButton) {

            loadJobDetails(
                viewButton.dataset.viewJob
            );

            return;
        }


        const acceptButton =
            event.target.closest(
                "[data-accept-job]"
            );


        if (acceptButton) {

            loadJobDetails(
                acceptButton.dataset.acceptJob
            );

            return;
        }


        if (
            event.target.closest(
                "[data-close-modal]"
            )
        ) {

            closeJobModal();
        }
    }
);


document
    .querySelectorAll(".jobs-tab")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showTab(
                    button.dataset.tab
                );
            }
        );
    });


modalAcceptButton.addEventListener(
    "click",
    () => acceptJob(selectedJobId)
);


document.getElementById(
    "refreshJobsButton"
).addEventListener(
    "click",
    loadAvailableJobs
);


document.getElementById(
    "logoutButton"
).addEventListener(
    "click",
    async () => {

        try {

            await logoutUser();

        } catch (error) {

            setJobsMessage(
                error.message,
                "error"
            );
        }
    }
);


async function initializeJobsPage() {

    try {

        activeSession =
            await requireAuthentication();


        if (!activeSession) {
            return;
        }


        await loadNavbarUser();


        await Promise.all([
            loadAvailableJobs(),
            loadAcceptedJobs()
        ]);


    } catch (error) {

        console.error(
            "Jobs page initialization error:",
            error
        );


        setJobsMessage(
            error.message,
            "error"
        );
    }
}


initializeJobsPage();