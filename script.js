const API_URL = "http://127.0.0.1:8000";

function getAuthToken() {
    return localStorage.getItem("adaptiq_token");
}

let generatedQuiz = null;
let currentQuestion = 0;
let studentAnswers = [];

let currentStudyPlan = null;


/* =====================================================
   THEME
===================================================== */

function toggleTheme() {

    document.body.classList.toggle("light");

    const button = document.querySelector(".theme-btn");

    if (document.body.classList.contains("light")) {
        button.textContent = "🌙";
    } else {
        button.textContent = "☀";
    }
}



/* =====================================================
   NAVIGATION
===================================================== */

function scrollToSection(id) {

    const section = document.getElementById(id);

    if (section) {

        section.scrollIntoView({
            behavior: "smooth"
        });

    }
}


function startLearning() {

    scrollToSection("learning");

}


function startQuiz() {

    scrollToSection("learning");

}



/* =====================================================
   GENERATE DIAGNOSTIC QUIZ
===================================================== */

async function generateDiagnosticQuiz() {

    const subject =
        document.getElementById("subject-input").value.trim();

    const syllabus =
        document.getElementById("syllabus-input").value.trim();

    const status =
        document.getElementById("generation-status");


    if (!subject) {
        status.textContent =
            "Please enter a subject.";
        return;
    }


    if (!syllabus) {
        status.textContent =
            "Please enter your syllabus.";
        return;
    }


    status.textContent =
        "AI is analyzing your syllabus and generating questions...";


    try {

        /* Get logged-in user's JWT token */

        const token = getAuthToken();

        console.log("QUIZ TOKEN EXISTS:", !!token);


        if (!token) {

            status.textContent =
                "Login session not found. Please login again.";

            return;
        }


        /* Data sent to backend */

        const data = {
            subject: subject,
            syllabus: syllabus
        };


        console.log("QUIZ DATA:", data);


        /* Call backend */

        const response =
            await fetch(
                `${API_URL}/quiz/generate`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify(data)
                }
            );


        const result =
            await response.json();


        console.log("QUIZ RESPONSE:", result);


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Failed to generate quiz."
            );

        }


        /* Save generated quiz */

        generatedQuiz = result;

        currentQuestion = 0;

        studentAnswers = [];


        console.log(
            "GENERATED QUIZ:",
            generatedQuiz
        );


        status.textContent =
            "Quiz generated successfully!";


        /* Load first question */

        loadBackendQuestion();


    } catch (error) {

        console.error(
            "QUIZ ERROR:",
            error
        );


        status.textContent =
            "Unable to generate quiz: " +
            error.message;

    }

}



/* =====================================================
   LOAD QUIZ QUESTION
===================================================== */

function loadBackendQuestion() {

    if (
        !generatedQuiz ||
        !generatedQuiz.questions ||
        generatedQuiz.questions.length === 0
    ) {

        return;

    }


    const questionData =
        generatedQuiz.questions[currentQuestion];


    const questionElement =
        document.getElementById("question");


    const questionNumber =
        document.getElementById("question-number");


    questionElement.textContent =
        questionData.question;


    questionNumber.textContent =
        "Question " +
        (currentQuestion + 1) +
        " / " +
        generatedQuiz.questions.length;


    const optionButtons =
        document.querySelectorAll(".options button");


    optionButtons.forEach(
        function(button, index) {

            button.textContent =
                questionData.options[index];

            button.disabled = false;

            button.classList.remove("correct");

            button.classList.remove("wrong");


            button.onclick =
                function() {

                    selectBackendAnswer(
                        index,
                        button
                    );

                };

        }
    );

}



/* =====================================================
   SELECT ANSWER
===================================================== */

function selectBackendAnswer(
    selectedIndex,
    selectedButton
) {

    const buttons =
        document.querySelectorAll(".options button");


    buttons.forEach(
        function(button) {

            button.disabled = true;

        }
    );


    const questionData =
        generatedQuiz.questions[currentQuestion];


    const selectedAnswer =
        questionData.options[selectedIndex];


    studentAnswers[currentQuestion] =
        selectedAnswer;


    if (
        selectedAnswer ===
        questionData.answer
    ) {

        selectedButton.classList.add(
            "correct"
        );

    } else {

        selectedButton.classList.add(
            "wrong"
        );


        buttons.forEach(
            function(button) {

                if (
                    button.textContent ===
                    questionData.answer
                ) {

                    button.classList.add(
                        "correct"
                    );

                }

            }
        );

    }

}



/* =====================================================
   NEXT QUESTION
===================================================== */

function nextQuestion() {

    if (!generatedQuiz) {

        alert(
            "Please generate a diagnostic quiz first."
        );

        return;
    }


    if (
        studentAnswers[currentQuestion] ===
        undefined
    ) {

        alert(
            "Please select an answer first."
        );

        return;
    }


    if (
        currentQuestion >=
        generatedQuiz.questions.length - 1
    ) {

        submitQuizToBackend();

        return;

    }


    currentQuestion++;


    loadBackendQuestion();

}



/* =====================================================
   SUBMIT QUIZ
===================================================== */

async function submitQuizToBackend() {

    const card =
        document.querySelector(".question-card");


    card.innerHTML = `

        <div style="text-align:center">

            <h2>
                Analyzing Your Performance...
            </h2>

            <p style="
                color:#94a0b8;
                margin-top:10px;
            ">
                AdaptIQ is determining your recommended
                learning level.
            </p>

        </div>

    `;


    try {

        const response =
            await fetch(
                `${API_URL}/quiz/submit`,
                {
                    method: "POST",

                   headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getAuthToken()}`
},

                    body: JSON.stringify({

                        questions:
                            generatedQuiz.questions,

                        answers:
                            studentAnswers

                    })
                }
            );


        if (!response.ok) {

    const errorData = await response.json();

    throw new Error(
        errorData.detail ||
        "Quiz submission failed."
    );

}


        const result =
            await response.json();


        /* Update dashboard */

        updateDashboardStats(result);


        /* Show result */

        showQuizResult(result);


        /* Generate study plan */

        generateStudyPlan(result);


    } catch (error) {

        console.error(error);


        card.innerHTML = `

            <div style="text-align:center">

                <h2>
                    Something went wrong
                </h2>

                <p style="
    color:#94a0b8;
    margin-top:10px;
">
    ${error.message}
</p>

            </div>

        `;

    }

}



/* =====================================================
   UPDATE DASHBOARD
===================================================== */

function updateDashboardStats(result) {

    const score =
        Math.round(result.percentage);


    const scoreElement =
        document.getElementById(
            "average-score"
        );


    const levelElement =
        document.getElementById(
            "current-level"
        );


    if (scoreElement) {

        scoreElement.textContent =
            score + "%";

    }


    if (levelElement) {

        levelElement.textContent =
            result.recommended_level;

    }


    /* Progress section */

    const progressScore =
        document.getElementById(
            "progress-score"
        );


    const diagnosticProgressBar =
        document.getElementById(
            "diagnostic-progress-bar"
        );


    const progressLevel =
        document.getElementById(
            "progress-level"
        );


    if (progressScore) {

        progressScore.textContent =
            score + "%";

    }


    if (diagnosticProgressBar) {

        diagnosticProgressBar.style.width =
            score + "%";

    }


    if (progressLevel) {

        progressLevel.textContent =
            result.recommended_level;

    }


    /* Explainable AI */

    const reasonScore =
        document.getElementById(
            "reason-score"
        );


    const reasonLevel =
        document.getElementById(
            "reason-level"
        );


    if (reasonScore) {

        reasonScore.textContent =
            score + "%";

    }


    if (reasonLevel) {

        reasonLevel.textContent =
            result.recommended_level;

    }

}



/* =====================================================
   SHOW QUIZ RESULT
===================================================== */

function showQuizResult(result) {

    const card =
        document.querySelector(
            ".question-card"
        );


    card.innerHTML = `

        <div style="text-align:center">

            <div style="
                font-size:50px;
                margin-bottom:15px;
            ">
                🎉
            </div>


            <h2>
                Diagnostic Test Completed!
            </h2>


            <p style="
                color:#94a0b8;
                margin-top:10px;
            ">
                Your diagnostic score
            </p>


            <div style="
                font-size:45px;
                font-weight:800;
                margin:15px 0;
                color:#16c9f5;
            ">
                ${Math.round(result.percentage)}%
            </div>


            <p style="
                color:#94a0b8;
            ">
                Score:
                ${result.score}
            </p>


            <p style="
                margin-top:15px;
                font-size:20px;
                font-weight:700;
            ">

                Recommended Level:

                <span style="
                    color:#9b5cff;
                ">
                    ${result.recommended_level}
                </span>

            </p>


            <p style="
                color:#94a0b8;
                margin-top:15px;
            ">
                Generating your personalized
                study plan...
            </p>

        </div>

    `;


    scrollToSection(
        "quiz-result-section"
    );



    /* Update result container */

    const resultContainer =
        document.getElementById(
            "quiz-result-container"
        );


    if (resultContainer) {

        resultContainer.innerHTML = `

            <div class="study-progress-card">

                <div class="study-progress-header">

                    <h3>
                        Diagnostic Performance
                    </h3>

                    <span
                        class="study-progress-percentage"
                    >
                        ${Math.round(result.percentage)}%
                    </span>

                </div>


                <p class="study-progress-message">

                    You answered
                    <strong>
                        ${result.correct_answers}
                    </strong>
                    out of
                    <strong>
                        ${result.total_questions}
                    </strong>
                    questions correctly.

                </p>


                <p class="study-progress-message">

                    Recommended learning level:
                    <strong>
                        ${result.recommended_level}
                    </strong>

                </p>

            </div>

        `;

    }

}



/* =====================================================
   GENERATE STUDY PLAN
===================================================== */

async function generateStudyPlan(result) {

    const subject =
        document.getElementById(
            "subject-input"
        ).value.trim();


    const syllabus =
        document.getElementById(
            "syllabus-input"
        ).value.trim();


    try {

        const response =
            await fetch(
                `${API_URL}/study-plan/generate`,
                {
                    method: "POST",
headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getAuthToken()}`
},

                    body: JSON.stringify({

                        subject: subject,

                        syllabus: syllabus,

                        score:
                            result.correct_answers,

                        total_questions:
                            result.total_questions,

                        level:
                            result.recommended_level

                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                "Study plan generation failed."
            );

        }


        const studyPlan =
            await response.json();


        currentStudyPlan =
            studyPlan;


        displayStudyPlan(
            studyPlan
        );


        updateLearningFocus(
            studyPlan
        );


        updateRecommendations(
            studyPlan,
            result
        );

} catch (error) {

    console.error("STUDY PLAN ERROR:", error);

    document.getElementById(
        "study-plan-container"
    ).innerHTML = `

        <div class="empty-plan">

            Unable to generate your study plan.

            <p style="margin-top:10px;">
                ${error.message}
            </p>

        </div>

    `;

}
    

}



/* =====================================================
   TODAY'S LEARNING FOCUS
===================================================== */

function updateLearningFocus(plan) {

    if (
        !plan ||
        !plan.days ||
        plan.days.length === 0
    ) {

        return;

    }


    const firstDay =
        plan.days[0];


    const topicElement =
        document.getElementById(
            "focus-topic"
        );


    const scoreElement =
        document.getElementById(
            "focus-score"
        );


    const descriptionElement =
        document.getElementById(
            "focus-description"
        );


    if (topicElement) {

        topicElement.textContent =
            firstDay.topic;

    }


    if (scoreElement) {

        scoreElement.textContent =
            "DAY 1";

    }


    if (descriptionElement) {

        descriptionElement.textContent =
            firstDay.goal;

    }

}



/* =====================================================
   DYNAMIC RECOMMENDATIONS
===================================================== */

function updateRecommendations(
    plan,
    result
) {

    const container =
        document.getElementById(
            "recommendation-container"
        );


    if (
        !container ||
        !plan ||
        !plan.days
    ) {

        return;

    }


    container.innerHTML = "";


    plan.days.forEach(
        function(day) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "recommendation-card";


            card.innerHTML = `

                <div class="recommendation-top">

                    <span class="medium-badge">

                        DAY ${day.day}

                    </span>

                    <span>
                        ${result.recommended_level}
                    </span>

                </div>


                <h3>
                    ${day.topic}
                </h3>


                <p>
                    ${day.goal}
                </p>


                <div class="progress-bar">

                    <div
                        style="width:0%"
                    ></div>

                </div>


                <div class="recommendation-bottom">

                    <span>
                        Practice:
                        ${day.practice}
                    </span>

                    <button
                        onclick="scrollToStudyDay(${day.day})"
                    >
                        View →
                    </button>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}



/* =====================================================
   SCROLL TO STUDY DAY
===================================================== */

function scrollToStudyDay(dayNumber) {

    const cards =
        document.querySelectorAll(
            ".study-day"
        );


    cards.forEach(
        function(card) {

            const dayText =
                card.querySelector(
                    ".study-day-number"
                );


            if (!dayText) {
                return;
            }


            const day =
                parseInt(
                    dayText.textContent
                        .replace("DAY", "")
                        .trim()
                );


            if (day === dayNumber) {

                card.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });


                card.style.transform =
                    "scale(1.02)";


                setTimeout(
                    function() {

                        card.style.transform =
                            "";

                    },
                    700
                );

            }

        }
    );

}



/* =====================================================
   DISPLAY STUDY PLAN
===================================================== */

function displayStudyPlan(plan) {

    const container =
        document.getElementById(
            "study-plan-container"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const totalDays =
        plan.days.length;


    let completedDays =
        JSON.parse(
            localStorage.getItem(
                "adaptiq_completed_days"
            ) || "[]"
        );


    /* ---------------------------------------------
       PROGRESS CARD
    --------------------------------------------- */

    const progressCard =
        document.createElement(
            "div"
        );


    progressCard.className =
        "study-progress-card";


    progressCard.innerHTML = `

    <div class="study-progress-header">

        <h3>
            Learning Path Progress
        </h3>

    </div>

    <div class="circular-progress">

        <svg
            class="progress-ring"
            width="180"
            height="180"
            viewBox="0 0 180 180"
        >

            <circle
                class="progress-ring-background"
                cx="90"
                cy="90"
                r="75"
            ></circle>

            <circle
                id="study-progress-circle"
                class="progress-ring-fill"
                cx="90"
                cy="90"
                r="75"
            ></circle>

        </svg>

        <div class="circular-progress-text">

            <span id="study-progress-percentage">
                0%
            </span>

            <small>
                Complete
            </small>

        </div>

    </div>

    <p
        id="study-progress-message"
        class="study-progress-message"
    >
        Complete your first day to start
        your learning journey.
    </p>

`;


    container.appendChild(
        progressCard
    );



    /* ---------------------------------------------
       STUDY DAYS
    --------------------------------------------- */

    plan.days.forEach(
        function(day) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "study-day";


            const isCompleted =
                completedDays.includes(
                    day.day
                );


            if (isCompleted) {

                card.classList.add(
                    "completed"
                );

            }


            card.innerHTML = `

                <span class="study-day-number">

                    DAY ${day.day}

                </span>


                <h3>
                    ${day.topic}
                </h3>


                <p>

                    <strong>
                        Goal:
                    </strong>

                    ${day.goal}

                </p>


                <p>

                    <strong>
                        Practice:
                    </strong>

                    ${day.practice}

                </p>


                <button
                    class="complete-day-btn ${
                        isCompleted
                            ? "completed-btn"
                            : ""
                    }"
                    onclick="completeStudyDay(${day.day})"
                    ${
                        isCompleted
                            ? "disabled"
                            : ""
                    }
                >

                    ${
                        isCompleted
                            ? "✓ Day Completed"
                            : `Mark Day ${day.day} as Complete`
                    }

                </button>

            `;


            container.appendChild(
                card
            );

        }
    );


    updateStudyProgress(
        totalDays
    );



    /* Do NOT scroll automatically here */

}



/* =====================================================
   COMPLETE STUDY DAY
===================================================== */

function completeStudyDay(
    dayNumber
) {

    let completedDays =
        JSON.parse(
            localStorage.getItem(
                "adaptiq_completed_days"
            ) || "[]"
        );


    if (
        !completedDays.includes(
            dayNumber
        )
    ) {

        completedDays.push(
            dayNumber
        );

    }


    completedDays.sort(
        function(a, b) {
            return a - b;
        }
    );


    localStorage.setItem(
        "adaptiq_completed_days",
        JSON.stringify(
            completedDays
        )
    );


    const cards =
        document.querySelectorAll(
            ".study-day"
        );


    cards.forEach(
        function(card) {

            const dayText =
                card.querySelector(
                    ".study-day-number"
                );


            if (!dayText) {
                return;
            }


            const day =
                parseInt(
                    dayText.textContent
                        .replace("DAY", "")
                        .trim()
                );


            if (
                day === dayNumber
            ) {

                card.classList.add(
                    "completed"
                );


                const button =
                    card.querySelector(
                        ".complete-day-btn"
                    );


                if (button) {

                    button.textContent =
                        "✓ Day Completed";

                    button.classList.add(
                        "completed-btn"
                    );

                    button.disabled =
                        true;

                }

            }

        }
    );


    const totalDays =
        document.querySelectorAll(
            ".study-day"
        ).length;


    updateStudyProgress(
        totalDays
    );

}



/* =====================================================
   UPDATE STUDY PROGRESS
===================================================== */

function updateStudyProgress(totalDays) {

    if (totalDays <= 0) {
        return;
    }

    const completedDays =
        JSON.parse(
            localStorage.getItem(
                "adaptiq_completed_days"
            ) || "[]"
        );

    /* Count only valid completed days */

    const completedCount =
        completedDays.filter(function(day) {

            return (
                day >= 1 &&
                day <= totalDays
            );

        }).length;


    const percentage =
        Math.round(
            (completedCount / totalDays) * 100
        );


    /* Percentage text */

    const percentageElement =
        document.getElementById(
            "study-progress-percentage"
        );


    /* Circular progress */

    const progressCircle =
        document.getElementById(
            "study-progress-circle"
        );


    const messageElement =
        document.getElementById(
            "study-progress-message"
        );


    if (
        !percentageElement ||
        !progressCircle ||
        !messageElement
    ) {

        return;

    }


    /* Update percentage */

    percentageElement.textContent =
        percentage + "%";


    /*
     * Circle circumference:
     *
     * radius = 75
     * circumference = 2 × π × 75
     */

    const circumference =
        2 * Math.PI * 75;


    progressCircle.style.strokeDasharray =
        circumference;


    /*
     * 0%   = completely empty
     * 50%  = half circle
     * 100% = completely filled
     */

    const offset =
        circumference -
        (percentage / 100) * circumference;


    progressCircle.style.strokeDashoffset =
        offset;


    /* Dashboard topics */

    const topicsCompleted =
        document.getElementById(
            "topics-completed"
        );


    if (topicsCompleted) {

        topicsCompleted.textContent =
            completedCount;

    }


    /* Overall progress */

    const overallProgress =
        document.getElementById(
            "overall-progress"
        );


    const overallProgressBar =
        document.getElementById(
            "overall-progress-bar"
        );


    const completedDaysElement =
        document.getElementById(
            "completed-days"
        );


    if (overallProgress) {

        overallProgress.textContent =
            percentage + "%";

    }


    if (overallProgressBar) {

        overallProgressBar.style.width =
            percentage + "%";

    }


    if (completedDaysElement) {

        completedDaysElement.textContent =
            completedCount +
            " / " +
            totalDays;

    }


    /* Progress messages */

    if (percentage === 0) {

        messageElement.textContent =
            "Your learning journey starts here. Complete Day 1 to begin!";

    }

    else if (percentage < 50) {

        messageElement.textContent =
            "Great start! Keep going and build your learning progress.";

    }

    else if (percentage < 100) {

        messageElement.textContent =
            "You're making excellent progress. Keep going!";

    }

    else {

        messageElement.textContent =
            "🎉 Amazing work! You completed your learning path!";

        showCompletionMessage();

    }

}


/* =====================================================
   COMPLETION MESSAGE
===================================================== */

function showCompletionMessage() {

    const container =
        document.getElementById(
            "study-plan-container"
        );


    if (!container) {
        return;
    }


    if (
        document.querySelector(
            ".study-complete-message"
        )
    ) {

        return;

    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "study-complete-message";


    message.innerHTML = `

        <h3>
            🎉 Learning Path Completed!
        </h3>

        <p>
            You completed all 7 days of your
            personalized learning plan.
            Keep learning and continue building
            your skills!
        </p>

    `;


    container.appendChild(
        message
    );

}



/* =====================================================
   PAGE LOAD
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "AdaptIQ frontend loaded successfully."
        );


        /* Reset dashboard display */

        const topicsCompleted =
            document.getElementById(
                "topics-completed"
            );


        if (topicsCompleted) {

            topicsCompleted.textContent =
                "0";

        }

    }
);