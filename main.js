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

function filterByRange(data, rangeInSeconds) {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - rangeInSeconds;
    return Object.fromEntries(
        Object.entries(data).filter(([ts, val]) => ts >= cutoff)
    );
}

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

let pingChart = null;
let ccuChart = null;

async function buildCharts(range = "day") {
    await getPings();
    await getCCUs();
    
    if (pingChart) pingChart.destroy();
    if (ccuChart) ccuChart.destroy();

    const ranges = {
        hour: 60*60,
        sixHours: 60*60*6,
        day: 60*60*24,
        threeDays: 60*60*24*3,
        week: 60*60*24*7,
        month: 60*60*24*30
    };

    const rangeSeconds = ranges[range];

    // ----------------------
    // Filter Pings
    // ----------------------
    const filteredPings = filterByRange(pings, rangeSeconds);

    const pingTimestamps = Object.keys(filteredPings).sort();
    const pingLabels = pingTimestamps.map(ts => new Date(ts * 1000).toLocaleTimeString());
    const apiPing = pingTimestamps.map(ts => filteredPings[ts].apitime);
    const netPing = pingTimestamps.map(ts => filteredPings[ts].network);

    pingChart = new Chart(document.getElementById("pingChart"), {
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
    // Filter CCUs
    // ----------------------
    const filteredCCUs = {};
    for (const [game, gameData] of Object.entries(ccus)) {
        filteredCCUs[game] = filterByRange(gameData, rangeSeconds);
    }

    const allTimestamps = new Set(Object.values(filteredCCUs).flatMap(g => Object.keys(g)));
    const sortedTimestamps = Array.from(allTimestamps).sort((a,b)=>a-b);
    const ccuLabels = sortedTimestamps.map(ts => new Date(ts * 1000).toLocaleTimeString());

    const ccuDatasets = [];
    const colors = ['darkred', 'yellow', 'green','orange','purple','cyan','magenta','brown','lime','teal'];
    let colorIndex = 0;

    for (const [game, data] of Object.entries(filteredCCUs)) {
        ccuDatasets.push({
            label: game,
            data: sortedTimestamps.map(ts => data[ts] ?? null),
            borderColor: colors[colorIndex % colors.length],
            fill: false
        });
        colorIndex++;
    }

    ccuChart = new Chart(document.getElementById("ccuChart"), {
        type: 'line',
        data: { labels: ccuLabels, datasets: ccuDatasets },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

document.getElementById('range1h').addEventListener('click', () => {
    buildCharts("hour");
});
document.getElementById('range6h').addEventListener('click', () => {
    buildCharts("sixHours");
});
document.getElementById('range1d').addEventListener('click', () => {
    buildCharts("day");
});
document.getElementById('range3d').addEventListener('click', () => {
    buildCharts("threeDays");
});
document.getElementById('range1w').addEventListener('click', () => {
    buildCharts("week");
});
document.getElementById('range1m').addEventListener('click', () => {
    buildCharts("month");
});

buildCharts();