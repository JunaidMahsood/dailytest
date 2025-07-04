let timerInterval;

function validateLogin() {
    // Skip validation entirely and store placeholder user
    const username = document.getElementById('username').value.trim() || "Guest";
    const contact = document.getElementById('contact').value.trim() || "0000000000";

    localStorage.setItem('currentUser', JSON.stringify({
        name: username,
        contact: contact
    }));

    // Directly start quiz
    startQuiz();
}

function startQuiz() {
    const meta = JSON.parse(localStorage.getItem('mcqMeta'));
    let timeLeft = meta?.timeLimit || 60;

    document.getElementById('form-container').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    loadQuestionsFromStorage();

    document.getElementById('time').textContent = `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;

    timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        document.getElementById('time').textContent = `${minutes}m ${seconds}s`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
            alert('Time is up!');
        }
    }, 1000);
}

function loadQuestionsFromStorage() {
    const savedMCQs = localStorage.getItem('mcqData');
    document.getElementById('questions-area').innerHTML = savedMCQs || '<p>No MCQs loaded yet.</p>';
}

function submitQuiz() {
    clearInterval(timerInterval);

    const meta = JSON.parse(localStorage.getItem('mcqMeta'));
    const correctAnswers = meta?.correctAnswers || {};
    const testId = meta?.testId;

    let score = 0;
    const form = document.getElementById('quiz-form');
    let userAnswers = {};

    for (let key in correctAnswers) {
        const selected = form.querySelector(`input[name="${key}"]:checked`);
        const selectedValue = selected ? selected.value : 'No Answer';
        userAnswers[key] = selectedValue;

        if (selectedValue === correctAnswers[key]) {
            score++;
        }
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    const resultEntry = {
        name: currentUser.name || 'Unknown',
        contact: currentUser.contact || '',
        correct: score,
        wrong: Object.keys(correctAnswers).length - score,
        timestamp: new Date().toISOString(),
        testId: testId,
        answers: userAnswers // Store user answers for report
    };

    const allResults = JSON.parse(localStorage.getItem('userResults')) || [];
    allResults.push(resultEntry);
    localStorage.setItem('userResults', JSON.stringify(allResults));

    document.getElementById('quiz-form').classList.add('hidden');
    const resultDiv = document.getElementById('result');
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `
        <p>You scored ${score} out of ${Object.keys(correctAnswers).length}</p>
        <button onclick="downloadPdfReport()">Download PDF Result</button>
    `;

    localStorage.setItem('lastResultEntry', JSON.stringify(resultEntry));
}
async function downloadPdfReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const result = JSON.parse(localStorage.getItem('lastResultEntry'));
    const mcqData = document.getElementById('questions-area').innerHTML;
    const correctAnswers = JSON.parse(localStorage.getItem('mcqMeta')).correctAnswers;
    const totalTimeInSeconds = JSON.parse(localStorage.getItem('mcqMeta')).timeLimit || 60;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = mcqData;

    let y = 15;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 128); // Dark Blue
    doc.setFont('helvetica', 'bold');
    doc.text('Test Report', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Student Name
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name:`, margin, y);

    doc.text(result.name, margin + 25, y);
    y += 10;

    // Date & Time
    const testDate = new Date(result.timestamp);
    const formattedDate = testDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = testDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Date:', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formattedDate, margin + 25, y);

    doc.setFont('helvetica', 'normal');
    doc.text('Time:', margin + 100, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formattedTime, margin + 120, y);
    y += 10;

    // Stats
    const totalQuestions = Object.keys(correctAnswers).length;
    const attempted = Object.values(result.answers).filter(ans => ans && ans !== 'No Answer').length;
    const unattempted = totalQuestions - attempted;

    const timeTakenInSeconds = (new Date() - new Date(result.timestamp)) / 1000;
    const totalTimeFormatted = formatTime(totalTimeInSeconds);
    const timeTakenFormatted = formatTime(timeTakenInSeconds);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 128); // Blue titles

    doc.text('Total Questions:', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalQuestions}`, margin + 45, y);

    doc.setFont('helvetica', 'normal');
    doc.text('Attempted:', margin + 100, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${attempted}`, margin + 130, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.text('Unattempted:', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${unattempted}`, margin + 45, y);

    doc.setFont('helvetica', 'normal');
    doc.text('Duration (Total):', margin + 100, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalTimeFormatted}`, margin + 140, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.text('Time Taken:', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${timeTakenFormatted}`, margin + 45, y);
    y += 12;

    // Score
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34); // Dark Green
    doc.text(`Score: ${result.correct} / ${totalQuestions}`, margin, y);
    y += 15;

    // Questions Loop
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);

    for (let key in correctAnswers) {
        const questionBlock = tempDiv.querySelector(`[data-question-id="${key}"]`);
        const questionText = questionBlock?.querySelector('.question-text')?.textContent || `Q${key}`;

        doc.setFont('helvetica', 'bold');
        doc.text(`${key}:`, margin, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.text(questionText, margin, y);
        y += 9;

        // User Answer
        doc.setFont('helvetica', 'bold');
        doc.text(`Your Answer:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${result.answers[key] || 'No Answer'}`, margin + 35, y);
        y += 7;

        // Correct Answer
        doc.setFont('helvetica', 'bold');
        doc.text(`Correct Answer:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${correctAnswers[key]}`, margin + 42, y);
        y += 15;

        // Page break if needed
        if (y > 250) {
            doc.addPage();
            y = 15;
        }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page 1 of 1`, pageWidth - margin - 10, doc.internal.pageSize.height - 10, { align: 'right' });

    doc.save(`Result_${result.name.replace(/\s+/g, '_')}.pdf`);
}

// Helper
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
}
