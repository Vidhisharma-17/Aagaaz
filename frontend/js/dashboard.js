const API_BASE_URL =
    "http://127.0.0.1:8000";


const dashboardMessage =
    document.getElementById(
        "dashboardMessage"
    );


const workHistoryContainer =
    document.getElementById(
        "workHistoryContainer"
    );


const predictionsContainer =
    document.getElementById(
        "dashboardPredictionsContainer"
    );


const certificatesContainer =
    document.getElementById(
        "certificatesContainer"
    );


let activeSession = null;


function setDashboardMessage(
    text = "",
    type = ""
) {

    dashboardMessage.textContent = text;

    dashboardMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    if (type) {
        dashboardMessage.classList.add(type);
    }
}


async function dashboardAuthenticatedFetch(
    endpoint,
    options = {}
) {

    const token =
        await getAccessToken();


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

                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


    let result = {};


    try {

        result =
            await response.json();

    } catch {

        result = {};
    }


    if (!response.ok) {

        const detail = result.detail;


        let message =
            result.message ||
            "Unable to load dashboard.";


        if (typeof detail === "string") {
            message = detail;
        }


        throw new Error(message);
    }


    return result;
}


function formatNumber(value) {

    const number = Number(value);


    return Number.isFinite(number)
        ? number.toLocaleString()
        : "0";
}


function formatReward(value) {

    const number = Number(value);


    return Number.isFinite(number)
        ? `₹${number.toLocaleString()}`
        : "₹0";
}


function formatDate(value) {

    if (!value) {
        return "--";
    }


    const date =
        new Date(value);


    return Number.isNaN(
        date.getTime()
    )
        ? value
        : date.toLocaleDateString();
}


function getArray(
    object,
    keys
) {

    for (const key of keys) {

        if (
            Array.isArray(
                object?.[key]
            )
        ) {

            return object[key];
        }
    }


    return [];
}


function renderUserProfile(userData) {

    const sessionUser =
        activeSession.user;


    const user =
        userData.user ||
        userData.profile ||
        sessionUser;


    const name =
        user.full_name ||
        user.name ||
        user.user_metadata?.full_name ||
        "EcoVisionAI User";


    const email =
        user.email ||
        sessionUser.email ||
        "--";


    const userId =
        user.id ||
        sessionUser.id ||
        "--";


    const createdAt =
        user.created_at ||
        sessionUser.created_at;


    document.getElementById(
        "navbarUserName"
    ).textContent = name;


    document.getElementById(
        "navbarUserEmail"
    ).textContent = email;


    document.getElementById(
        "profileName"
    ).textContent = name;


    document.getElementById(
        "profileEmail"
    ).textContent = email;


    document.getElementById(
        "profileUserId"
    ).textContent = userId;


    document.getElementById(
        "profileCreatedAt"
    ).textContent =
        formatDate(createdAt);


    document.getElementById(
        "profileAvatar"
    ).textContent =
        name
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "S";


    document.getElementById(
        "dashboardWelcome"
    ).textContent =
        `Welcome, ${name.split(" ")[0]}`;
}


function renderDashboardStatistics(
    data,
    predictions,
    jobs,
    certificates
) {

    const stats =
        data.stats ||
        data.statistics ||
        data.summary ||
        {};


    const acceptedCount =
        stats.accepted_jobs ??
        jobs.length;


    const completedCount =
        stats.completed_jobs ??
        jobs.filter(
            job =>
                String(
                    job.status
                ).toLowerCase() ===
                "completed"
        ).length;


    const totalRewards =
        stats.total_rewards ??
        jobs.reduce(
            (total, job) => {

                const status =
                    String(
                        job.status || ""
                    ).toLowerCase();


                return status === "completed"
                    ? total +
                      Number(
                          job.reward_per_worker ||
                          job.reward ||
                          0
                      )
                    : total;
            },
            0
        );


    const totalWaste =
        stats.total_waste_handled ??
        jobs.reduce(
            (total, job) =>
                total +
                Number(
                    job.predicted_waste ||
                    0
                ),
            0
        );


    const submissions =
        getArray(
            data,
            [
                "submissions",
                "uploads",
                "cleanup_submissions"
            ]
        );


    document.getElementById(
        "totalPredictions"
    ).textContent =
        formatNumber(
            stats.total_predictions ??
            predictions.length
        );


    document.getElementById(
        "acceptedJobs"
    ).textContent =
        formatNumber(acceptedCount);


    document.getElementById(
        "completedJobs"
    ).textContent =
        formatNumber(completedCount);


    document.getElementById(
        "totalRewards"
    ).textContent =
        formatReward(totalRewards);


    document.getElementById(
        "totalWasteHandled"
    ).textContent =
        `${formatNumber(totalWaste)} tons`;


    document.getElementById(
        "totalSubmissions"
    ).textContent =
        formatNumber(
            stats.total_submissions ??
            submissions.length
        );


    document.getElementById(
        "totalCertificates"
    ).textContent =
        formatNumber(
            stats.total_certificates ??
            certificates.length
        );
}


function renderWorkHistory(jobs) {

    workHistoryContainer.innerHTML = "";


    if (!jobs.length) {

        workHistoryContainer.innerHTML = `

            <p class="dashboard-empty-state">

                No cleanup activity yet.
                Browse available cleanup jobs to get started.

            </p>
        `;


        return;
    }


    jobs
        .slice(0, 8)
        .forEach(job => {

            const actualJob =
                job.job ||
                job;


            const status =
                job.status ||
                actualJob.status ||
                "Accepted";


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "work-history-card";


            card.innerHTML = `

                <div>

                    <strong>
                        ${
                            actualJob.event_name ||
                            "Cleanup Job"
                        }
                    </strong>

                    <span>
                        ${
                            actualJob.location ||
                            "--"
                        }
                    </span>

                </div>


                <div>

                    <strong>
                        ${
                            formatNumber(
                                actualJob.predicted_waste
                            )
                        } tons
                    </strong>

                    <span>
                        Predicted Waste
                    </span>

                </div>


                <div>

                    <span class="dashboard-status-badge">
                        ${status}
                    </span>

                </div>


                <div>

                    <strong>
                        ${
                            formatReward(
                                actualJob.reward_per_worker ||
                                actualJob.reward
                            )
                        }
                    </strong>

                    <span>
                        Reward
                    </span>

                </div>

            `;


            workHistoryContainer
                .appendChild(card);
        });
}


function renderPredictions(predictions) {

    predictionsContainer.innerHTML = "";


    if (!predictions.length) {

        predictionsContainer.innerHTML = `

            <p class="dashboard-empty-state">

                No predictions available yet.

            </p>
        `;


        return;
    }


    predictions
        .slice(0, 8)
        .forEach(prediction => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "dashboard-prediction-card";


            card.innerHTML = `

                <div>

                    <strong>
                        ${
                            prediction.event_name ||
                            prediction.event ||
                            "Prediction"
                        }
                    </strong>

                    <span>
                        ${
                            prediction.location ||
                            "--"
                        }
                    </span>

                </div>


                <div>

                    <strong>
                        ${
                            formatNumber(
                                prediction.predicted_waste
                            )
                        } tons
                    </strong>

                    <span>
                        Waste
                    </span>

                </div>


                <div>

                    <span class="dashboard-status-badge">
                        ${
                            prediction.pollution_risk ||
                            "--"
                        }
                    </span>

                </div>


                <div>

                    <strong>
                        ${
                            formatNumber(
                                prediction.workers_required
                            )
                        }
                    </strong>

                    <span>
                        Workers
                    </span>

                </div>

            `;


            predictionsContainer
                .appendChild(card);
        });
}


function renderCertificates(certificates) {

    certificatesContainer.innerHTML = "";


    if (!certificates.length) {

        certificatesContainer.innerHTML = `

            <p class="dashboard-empty-state">

                Complete cleanup work and generate
                your first EcoVisionAI certificate.

            </p>
        `;


        return;
    }


    certificates.forEach(
        certificate => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "certificate-card";


            const certificateUrl =
                certificate.certificate_url ||
                certificate.file_url ||
                certificate.url ||
                "";


            card.innerHTML = `

                <span class="card-label">
                    CERTIFICATE
                </span>


                <h3>
                    ${
                        certificate.title ||
                        certificate.event_name ||
                        "Cleanup Achievement"
                    }
                </h3>


                <p>
                    EcoVisionAI cleanup work
                    completion certificate.
                </p>


                <div class="certificate-card-footer">

                    <span>

                        Generated:
                        ${
                            formatDate(
                                certificate.created_at ||
                                certificate.generated_at
                            )
                        }

                    </span>


                    ${
                        certificateUrl

                        ? `

                            <a
                                href="${certificateUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="certificate-link"
                            >
                                View Certificate
                            </a>

                        `

                        : `

                            <span>
                                Certificate record available.
                            </span>

                        `
                    }

                </div>

            `;


            certificatesContainer
                .appendChild(card);
        }
    );
}


async function loadDashboard() {

    setDashboardMessage(
        "Loading your EcoVisionAI dashboard...",
        "info"
    );


    try {

        const response =
            await dashboardAuthenticatedFetch(
                "/api/dashboard/me"
            );


        console.log(
            "Dashboard API response:",
            response
        );


        const data =
            response.data ||
            response.dashboard ||
            response;


        const predictions =
            getArray(
                data,
                [
                    "predictions",
                    "prediction_history",
                    "recent_predictions"
                ]
            );


        const jobs =
            getArray(
                data,
                [
                    "jobs",
                    "my_jobs",
                    "work_history",
                    "applications"
                ]
            );


        const certificates =
            getArray(
                data,
                [
                    "certificates",
                    "my_certificates"
                ]
            );


        renderUserProfile(data);


        renderDashboardStatistics(
            data,
            predictions,
            jobs,
            certificates
        );


        renderWorkHistory(jobs);


        renderPredictions(predictions);


        renderCertificates(certificates);


        setDashboardMessage(
            "Dashboard updated successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        setDashboardMessage(
            error.message,
            "error"
        );
    }
}


async function initializeDashboard() {

    try {

        activeSession =
            await requireAuthentication();


        if (!activeSession) {
            return;
        }


        await loadDashboard();


    } catch (error) {

        console.error(
            "Dashboard initialization error:",
            error
        );


        setDashboardMessage(
            error.message,
            "error"
        );
    }
}


document.getElementById(
    "refreshDashboardButton"
).addEventListener(
    "click",
    loadDashboard
);


document.getElementById(
    "logoutButton"
).addEventListener(
    "click",
    async () => {

        try {

            await logoutUser();

        } catch (error) {

            setDashboardMessage(
                error.message,
                "error"
            );
        }
    }
);


initializeDashboard();