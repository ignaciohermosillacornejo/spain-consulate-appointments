import { launch } from 'puppeteer';
import { sendPushoverNotification } from './notify.js';

import dotenv from 'dotenv';
dotenv.config();

(async () => {
    // Launch the browser
    const browser = await launch({ headless: false, devtools: true });
    const page = await browser.newPage();

    // Navigate to the URL
    await page.goto('https://www.exteriores.gob.es/Consulados/santiagodechile/es/ServiciosConsulares/Paginas/CitaPrevia.aspx');

    // Click on the "Solicitud de Cita" link
    const citaLink = 'https://www.citaconsular.es/es/hosteds/widgetdefault/24e329baaaf932b93de4fc7f95bc53535';
    await page.waitForSelector(`a[href="${citaLink}"]`);
    await page.click(`a[href="${citaLink}"]`);


    // Wait for the new page or tab to load
    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
    const newPage = await newPagePromise;
    // Handle the alert by accepting it on the new page
    newPage.on('dialog', async dialog => {
        await dialog.accept();
    });
    // Wait for the button to be available and visible
    await newPage.waitForSelector('#idCaptchaButton', { visible: true });
    // Click on the "Continue / Continuar" button
    await newPage.click('#idCaptchaButton');

    // Check for availability
    await newPage.waitForSelector('#idDivBktServicesContainer > div:nth-child(2)', { visible: true });
    const noAvailability = await newPage.evaluate(() => {
        const widget = document.querySelector('#idDivBktServicesContainer > div:nth-child(2)');
        return widget && widget.textContent.includes('No hay horas disponibles.');
      });

    if (!noAvailability) {
        console.log('Appointment slots available!');
        await sendPushoverNotification('Appointments available! Go to https://bit.ly/4cFXN5E to schedule your appointment', 'Appointment Alert');
    } else {
        console.log('No appointment slots available.');
        await sendPushoverNotification('Appointment slots not available!', 'Appointment Alert', -2);
    }

    // Close the browser
    await browser.close();
})();
