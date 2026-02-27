/**
 * Shared k6 configuration — thresholds and base URL.
 */

export var BASE_URL = __ENV.API_BASE_URL || 'https://func-aops-test.azurewebsites.net';

export var YEAR = 2025;
export var EVENT_KEY = '2025mibig';

export var DEFAULT_THRESHOLDS = {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
};

export var LOAD_THRESHOLDS = {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
};

export var STRESS_THRESHOLDS = {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<5000'],
};
