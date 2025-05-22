// vote-million-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10000 },   // Ramp-up
    { duration: '6m', target: 10000 },   // Sustained
    { duration: '2m', target: 0 },      // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const teams = ['pradhan', 'banrakas'];

export default function () {
  const url = 'http://localhost:3001/api/vote';
  const team = teams[Math.floor(Math.random() * teams.length)];
  const payload = JSON.stringify({ team });

  const headers = {
    'Content-Type': 'application/json',
    'x-forwarded-for': `${__VU}.${__ITER}`, // Pseudo-unique IPs
  };

  const res = http.post(url, payload, { headers });

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}
