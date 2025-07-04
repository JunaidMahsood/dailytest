document.addEventListener('DOMContentLoaded', function () {
    const secretPassword = "MySuperSecret123";

    window.checkAdmin = function () {
        const enteredPassword = document.getElementById('adminPassword').value;
        if (enteredPassword === secretPassword) {
            document.getElementById('admin-login').classList.add('hidden');
            document.getElementById('admin-panel').classList.remove('hidden');
        } else {
            alert("Wrong password!");
        }
    };

    window.downloadCSV = function () {
        const results = JSON.parse(localStorage.getItem('userResults')) || [];
        if (!results.length) {
            alert("No results found.");
            return;
        }

        let csv = "Name,Contact,Correct,Wrong,Timestamp,Test ID\n";
        results.forEach(r => {
            csv += `${r.name},${r.contact},${r.correct},${r.wrong},${r.timestamp},${r.testId}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'quiz_results.csv';
        link.click();
        URL.revokeObjectURL(url);
    };
});
