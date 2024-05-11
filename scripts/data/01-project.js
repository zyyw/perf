// prepare projects
import { Rate } from 'k6/metrics'
import counter from 'k6/x/counter'
import { Harbor } from 'k6/x/harbor'

import { Settings } from '../config.js'
import { numberToPadString } from '../helpers.js'

const settings = Settings()

const totalIterations = settings.ProjectsCount

export let successRate = new Rate('success')

export let options = {
    setupTimeout: '6h',
    duration: '24h',
    vus: Math.min(settings.VUS, totalIterations),
    iterations: totalIterations,
    thresholds: {
        'success': ['rate>=1'],
        'iteration_duration{scenario:default}': [
            `max>=0`,
        ],
        'iteration_duration{group:::setup}': [`max>=0`],
    }
};

const harbor = new Harbor(settings.Harbor);

export function setup() {
    try {
        harbor.deleteProject('library')
        if (settings['FakeScannerURL'] !== '') {
            harbor.setScannerAsDefault(harbor.createScanner({ name: `fake-scanner-${Date.now()}`, url: settings.FakeScannerURL }))
        }
    } catch (e) {
        console.error(e.message)
    }
}

export default function () {
    const suffix = numberToPadString(counter.up(), settings.ProjectsCount)

    console.log("AutoSbomGen = " + settings['AutoSbomGen'])
    try {
        if (settings['AutoSbomGen'] === "true") {
            console.log("settings['AutoSbomGen'] is true")
            harbor.createProject({ projectName: `${settings.ProjectPrefix}-${suffix}`, metadata: `{"auto_sbom_generation": "true"}` })
        } else {
            console.log("settings['AutoSbomGen'] is NOT true")
            harbor.createProject({ projectName: `${settings.ProjectPrefix}-${suffix}` })
        }
        successRate.add(true)
    } catch (e) {
        successRate.add(false)
        console.error(e.message)
    }
}
