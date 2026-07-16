const API_BASE_URL =
    "http://127.0.0.1:8000";


const predictionForm =
    document.getElementById(
        "predictionForm"
    );


const predictionButton =
    document.getElementById(
        "predictionButton"
    );


const predictionMessage =
    document.getElementById(
        "predictionMessage"
    );


const predictionResult =
    document.getElementById(
        "predictionResult"
    );


const historyContainer =
    document.getElementById(
        "historyContainer"
    );


let activeSession = null;


function setPredictionMessage(
    text = "",
    type = ""
) {

    predictionMessage.textContent = text;

    predictionMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    if (type) {
        predictionMessage
            .classList
            .add(type);
    }

}


function fillSelect(
    elementId,
    values,
    placeholder
) {

    const select =
        document.getElementById(
            elementId
        );


    select.innerHTML =
        `<option value="">${placeholder}</option>`;


    (values || []).forEach((value) => {

        const option =
            document.createElement(
                "option"
            );


        option.value = value;

        option.textContent = value;

        select.appendChild(option);

    });

}


async function authenticatedFetch(
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


    const headers = {
        ...(options.headers || {}),
        "Authorization":
            `Bearer ${token}`
    };


    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );


    let result = null;


    try {

        result =
            await response.json();

    } catch {

        result = {};

    }


    if (!response.ok) {

        const detail =
            result.detail;


        let message =
            "Request failed.";


        if (typeof detail === "string") {

            message = detail;

        } else if (
            Array.isArray(detail)
        ) {

            message =
                detail
                    .map(
                        item =>
                            item.msg ||
                            JSON.stringify(item)
                    )
                    .join(", ");

        } else if (
            result.message
        ) {

            message =
                result.message;

        }


        throw new Error(message);

    }


    return result;
}


async function loadUserInformation() {

    if (!activeSession) {
        return;
    }


    const user =
        activeSession.user;


    const fullName =
        user.user_metadata
            ?.full_name ||
        "EcoVisionAI User";


    document.getElementById(
        "navbarUserName"
    ).textContent =
        fullName;


    document.getElementById(
        "navbarUserEmail"
    ).textContent =
        user.email || "";

}


async function loadPredictionOptions() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/predictions/options`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Unable to load prediction options."
            );

        }


        const options =
            result.data ||
            result;


        fillSelect(
            "event",
            options.events,
            "Select an event"
        );


        fillSelect(
            "location",
            options.locations,
            "Select a location"
        );


        fillSelect(
            "season",
            options.seasons,
            "Select a season"
        );


        fillSelect(
            "dayType",
            options.day_types,
            "Select day type"
        );


    } catch (error) {

        setPredictionMessage(
            error.message,
            "error"
        );

    }

}


function buildPredictionRequest() {

    const predictionData = {
        event: document.getElementById("event").value,
        location: document.getElementById("location").value,
        season: document.getElementById("season").value,
        day_type: document.getElementById("dayType").value,
        crowd: Number(document.getElementById("crowd").value),
        temperature: Number(document.getElementById("temperature").value)
    };

    return predictionData;
}


function displayPrediction(
    result
) {

    const prediction =
        result.data ||
        result.prediction ||
        result;


    document.getElementById(
        "predictedWaste"
    ).textContent =
        `${prediction.predicted_waste} tons`;


    document.getElementById(
        "pollutionRisk"
    ).textContent =
        prediction.pollution_risk;


    document.getElementById(
        "workersRequired"
    ).textContent =
        prediction.workers_required;


    const recommendations =
        document.getElementById(
            "recommendations"
        );


    recommendations.innerHTML = "";


    const items =
        prediction.recommendations ||
        [];


    if (!items.length) {

        const item =
            document.createElement(
                "li"
            );


        item.textContent =
            "Review the prediction results and plan cleanup resources accordingly.";


        recommendations.appendChild(
            item
        );

    } else {

        items.forEach(
            recommendation => {

                const item =
                    document.createElement(
                        "li"
                    );


                item.textContent =
                    recommendation;


                recommendations
                    .appendChild(item);

            }
        );

    }


    document.getElementById(
        "predictionTimestamp"
    ).textContent =
        new Date()
            .toLocaleString();


    predictionResult.hidden = false;


    predictionResult.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


async function handlePrediction(
    event
) {

    event.preventDefault();


    setPredictionMessage(
        "Running EcoVisionAI models...",
        "info"
    );


    predictionButton.disabled = true;

    predictionButton.textContent =
        "Generating Prediction...";


    try {

        const result =
            await authenticatedFetch(
                "/api/predictions/predict",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            buildPredictionRequest()
                        )
                }
            );


        displayPrediction(result);


        setPredictionMessage(
            "Prediction generated successfully.",
            "success"
        );


        await loadPredictionHistory();


    } catch (error) {

        console.error(
            "Prediction error:",
            error
        );


        setPredictionMessage(
            error.message,
            "error"
        );


    } finally {

        predictionButton.disabled = false;

        predictionButton.textContent =
            "Generate AI Prediction";

    }

}


function createHistoryCard(
    prediction
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "history-card";


    const eventName =
        prediction.event_name ||
        prediction.event ||
        "Event";


    const location =
        prediction.location ||
        "--";


    const waste =
        prediction.predicted_waste ??
        prediction.total_waste ??
        "--";


    const risk =
        prediction.pollution_risk ||
        "--";


    const workers =
        prediction.workers_required ??
        "--";


    card.innerHTML = `

        <div>
            <strong>${eventName}</strong>
            <span>${location}</span>
        </div>

        <div>
            <strong>${waste}</strong>
            <span>Waste Tons</span>
        </div>

        <div>
            <span class="risk-badge">
                ${risk}
            </span>
        </div>

        <div>
            <strong>${workers}</strong>
            <span>Workers</span>
        </div>

        <div>
            <span>
                ${
                    prediction.created_at
                        ? new Date(
                            prediction.created_at
                        ).toLocaleDateString()
                        : ""
                }
            </span>
        </div>

    `;


    return card;
}


async function loadPredictionHistory() {

    historyContainer.innerHTML =
        `<p class="empty-state">
            Loading prediction history...
        </p>`;


    try {

        const result =
            await authenticatedFetch(
                "/api/predictions/history"
            );


        const predictions =
            result.data ||
            result.predictions ||
            result;


        historyContainer.innerHTML = "";


        if (
            !Array.isArray(predictions) ||
            !predictions.length
        ) {

            historyContainer.innerHTML =
                `<p class="empty-state">
                    No predictions yet.
                    Generate your first AI prediction.
                </p>`;


            return;
        }


        predictions.forEach(
            prediction => {

                historyContainer.appendChild(
                    createHistoryCard(
                        prediction
                    )
                );

            }
        );


    } catch (error) {

        console.error(
            "History error:",
            error
        );


        historyContainer.innerHTML =
            `<p class="empty-state">
                ${error.message}
            </p>`;

    }

}


async function initializePredictionPage() {

    try {

        activeSession =
            await requireAuthentication();


        if (!activeSession) {
            return;
        }


        await loadUserInformation();


        await Promise.all([
            loadPredictionOptions(),
            loadPredictionHistory()
        ]);


    } catch (error) {

        console.error(
            "Prediction page initialization failed:",
            error
        );


        setPredictionMessage(
            error.message,
            "error"
        );

    }

}


predictionForm.addEventListener(
    "submit",
    handlePrediction
);


document.getElementById(
    "logoutButton"
).addEventListener(
    "click",
    async () => {

        try {

            await logoutUser();

        } catch (error) {

            setPredictionMessage(
                error.message,
                "error"
            );

        }

    }
);


document.getElementById(
    "newPredictionButton"
).addEventListener(
    "click",
    () => {

        predictionForm.reset();

        predictionResult.hidden = true;

        setPredictionMessage();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


document.getElementById(
    "refreshHistoryButton"
).addEventListener(
    "click",
    loadPredictionHistory
);


initializePredictionPage();