import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import { getFirestore, collection, getDocs, collectionGroup } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDDYj8ySKBXbQQI306oQGjOZBjDWeT9no8",
    authDomain: "rblxmon-41bde.firebaseapp.com",
    projectId: "rblxmon-41bde",
    storageBucket: "rblxmon-41bde.firebasestorage.app",
    messagingSenderId: "657389507427",
    appId: "1:657389507427:web:265b806348cd417ec03956",
    measurementId: "G-GKJ1X668TM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const pings = {};
const ccus = {};

async function getPings() {
    const pingRef = collection(db, "ping");
    const snapshot = await getDocs(pingRef);
    snapshot.forEach(doc => {
        pings[doc.id] = doc.data();
    });
}

async function getCCUs() {
    const gamesSnapshot = await getDocs(collection(db, "ccus"));
    const games = {};
    gamesSnapshot.forEach(doc => {
        games[doc.id] = doc.data().name || doc.id;
    });

    const snapshot = await getDocs(collectionGroup(db, "ccu"));
    snapshot.forEach(doc => {
        const data = doc.data();
        const gameId = doc.ref.parent.parent.id;
        const gameName = games[gameId] || gameId;

        if (!ccus[gameName]) ccus[gameName] = {};
        ccus[gameName][data.timestamp] = parseInt(data.ccu);
    });
}

async function buildCharts() {
    await getPings();
    await getCCUs();

    // ----------------------
    // Ping Chart
    // ----------------------
    const pingTimestamps = Object.keys(pings).sort();
    const pingLabels = pingTimestamps.map(ts => new Date(ts * 1000).toLocaleTimeString());
    const apiPing = pingTimestamps.map(ts => pings[ts].apitime);
    const netPing = pingTimestamps.map(ts => pings[ts].network);

    new Chart(document.getElementById("pingChart"), {
        type: 'line',
        data: {
            labels: pingLabels,
            datasets: [
                { label: 'API Time (ms)', data: apiPing, borderColor: 'red', fill: false },
                { label: 'Network Ping (ms)', data: netPing, borderColor: 'blue', fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // ----------------------
    // CCU Chart
    // ----------------------
    const allTimestamps = new Set(Object.values(ccus).flatMap(g => Object.keys(g)));
    const sortedTimestamps = Array.from(allTimestamps).sort((a,b)=>a-b);
    const ccuLabels = sortedTimestamps.map(ts => new Date(ts * 1000).toLocaleTimeString());

    const ccuDatasets = [];
    const colors = ['green','orange','purple','cyan','magenta','brown','lime','teal'];
    let colorIndex = 0;

    for (const [game, data] of Object.entries(ccus)) {
        ccuDatasets.push({
            label: game,
            data: sortedTimestamps.map(ts => data[ts] ?? null),
            borderColor: colors[colorIndex % colors.length],
            fill: false
        });
        colorIndex++;
    }

    new Chart(document.getElementById("ccuChart"), {
        type: 'line',
        data: { labels: ccuLabels, datasets: ccuDatasets },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

buildCharts();

setTimeout(() => {
    window.location.href = window.location.href; // looks stupid but works
}, 60000);