class CreateTransferDocsView extends View {
    get name() { return 'Transfer Docs'; }

    build() {
        const header = new Element('H1', null, {
            elementClass: 'view-header',
            text: 'Generate Transfer Docs'
        });

        this.addElement(header);

        const comment = new Element('DIV', null, {
            elementClass: 'view-comment',
            text: 'Use this to generate a PDF copy of transfer docs including cover pictures, phone numbers, addresses, area and missionary information, and the transfer calendar.'
        });

        this.addElement(comment);

        const zoneAreas = this.database.getZoneAreas();
        const covers = this.database.getCovers();

        const coverGallery = new Element('DIV', null, {
            elementClass: 'view-double-gallery'
        });

        let names = Object.keys(zoneAreas);
        names.splice(0, 0, 'Cover');
        names.push('Transfer Board');
        names.push('Calendar');

        for (const name of names) {
            const galleryEntry = new Element('DIV', coverGallery, {
                elementClass: 'view-gallery-entry'
            });

            new Element('H2', galleryEntry, {
                elementClass: 'view-gallery-header',
                text: name
            });

            const image = new Element('IMG', galleryEntry, {
                elementClass: 'view-gallery-picture',
                attributes: {
                    'SRC': covers[name]
                }
            });

            new Element('BUTTON', galleryEntry, {
                elementClass: 'view-gallery-button',
                text: 'Upload',
                eventListener: ['click', () => {
                    const filePath = dialog.showOpenDialogSync({
                        properties: ['openFile'],
                        filters: [
                            { name: 'Image', extensions: ['jpg', 'jpeg', 'png'] }
                        ]
                    });

                    if (filePath) {
                        const raw = this.database.importCover(
                            filePath[0],
                            name,
                            name === 'Transfer Board' || name === 'Calendar'
                        );

                        image.element.src = raw;
                    }
                }]
            });
        }

        this.addElement(coverGallery);

        const button = new Element('BUTTON', null, {
            elementClass: 'view-button',
            text: 'Generate',
            eventListener: ['click', () => {
                ipcRenderer.sendSync('create-window', 'generate', {
                    show: false,
                    webPreferences: {
                        nodeIntegration: true,
                        enableRemoteModule: true,
                        contextIsolation: false
                    },
                    titleBarStyle: 'hidden',
                    titleBarOverlay: {
                        color: '#292929',
                        symbolColor: '#fff',
                    },
                    minWidth: 600,
                    minHeight: 450,
                    backgroundColor: '#fff',
                });
            }]
        });

        this.addElement(button);
    }
}

function encodeQuotedPrintable(input) {
    let output = '';

    for (var i = 0; i < input.length; i++) {
        var charCode = input.charCodeAt(i);
        if (charCode === 61) { // '='
            output += '=3D';
        } else if (charCode < 32 || charCode > 126) {
            output += '=' + charCode.toString(16).toUpperCase().padStart(2, '0');
        } else {
            output += String.fromCharCode(charCode);
        }
    }
    return output;
}

function generateCard(name, reading, number1, number2, missionaries, photo, note, zone) {
    const template = `
BEGIN:VCARD
VERSION:2.1
FN:${name}
SOUND;X-IRMC-N;CHARSET=UTF-8:${reading};;;;
TEL;CELL:${number1}
TEL;CELL:${number2}
TEL;CELL:
TEL;CELL:
EMAIL;HOME:
ADR;HOME:;;;;;;
ORG:
TITLE:${missionaries}
PHOTO;ENCODING=BASE64;PNG:${photo}

NOTE;ENCODING=QUOTED-PRINTABLE:${note}
X-GN:JKM Contacts
X-GN:${zone}
X-CLASS:PUBLIC
X-REDUCTION:
X-NO:
X-DCM-HMN-MODE:
END:VCARD
`;

    return template;
}

class CreateContactsView extends View {
    get name() { return 'Contacts'; }

    build() {
        const header = new Element('H1', null, {
            elementClass: 'view-header',
            text: 'Generate Contacts Card'
        });

        this.addElement(header);

        const comment = new Element('DIV', null, {
            elementClass: 'view-comment',
            text: 'Use this to generate a =.vcf= file containing contact cards for each area.'
        });

        this.addElement(comment);

        const zoneAreas = this.database.getZoneAreas();
        const contactFaces = this.database.getContactFaces();

        const faceGallery = new Element('DIV', null, {
            elementClass: 'view-double-gallery'
        });

        let groups = [];

        for (const number of Object.values(this.database.numbers)) {
            if (groups.indexOf(number.group) === -1) {
                groups.push(number.group);
            }
        }

        for (const name of groups) {
            const galleryEntry = new Element('DIV', faceGallery, {
                elementClass: 'view-gallery-entry'
            });

            new Element('H2', galleryEntry, {
                elementClass: 'view-gallery-header',
                text: name
            });

            const image = new Element('IMG', galleryEntry, {
                elementClass: 'view-gallery-picture',
                attributes: {
                    'SRC': contactFaces[name]
                }
            });

            new Element('BUTTON', galleryEntry, {
                elementClass: 'view-gallery-button',
                text: 'Upload',
                eventListener: ['click', () => {
                    const filePath = dialog.showOpenDialogSync({
                        properties: ['openFile'],
                        filters: [
                            { name: 'Image', extensions: ['jpg', 'jpeg', 'png'] }
                        ]
                    });

                    if (filePath) {
                        const raw = this.database.importContactFace(
                            filePath[0],
                            name
                        );

                        image.element.src = raw;
                    }
                }]
            });
        }

        this.addElement(faceGallery);

        const button = new Element('BUTTON', null, {
            elementClass: 'view-button',
            text: 'Generate',
            eventListener: ['click', () => {
                const savePath = dialog.showSaveDialogSync({
                    filters: [
                        { name: 'VCF', extensions: ['vcf'] }
                    ]
                });

                if (savePath) {
                    let vcfOutput = [];

                    const yomiCycle = 'ｱｶｻﾀﾅﾊﾏﾔﾗﾜ';
                    let groupYomi = {};

                    let i = 0;
                    for (const name of groups) {
                        groupYomi[name] = yomiCycle[i % yomiCycle.length];
                        i++;
                    }

                    const contactFaces = this.database.getContactFaces();

                    Object.values(this.database.areas).forEach(area => {
                        let noteParts = [
                            `${area.district} District`,
                            `${area.zone} Zone`
                        ];

                        const encodedNote = encodeQuotedPrintable(noteParts.join(', '));
                        const numbers = this.database.getAllAreaNumbers(area.name);

                        if (!numbers.length) return;

                        const phoneA = numbers[0].number.replace(/^\+81\s*/, '');
                        const phoneB = numbers.length > 1 ? numbers[1].number.replace(/^\+81\s*/, '') : '';

                        const missionaries = area.people.map(name => {
                            const person = this.database.people[name];
                            return person.type + ' ' + name.split(',')[0];
                        }).join(', ');

                        const group = numbers[0].group;

                        const photo = group in contactFaces ? contactFaces[group] : '';

                        const card = generateCard(
                            area.name,
                            groupYomi[group],
                            phoneA,
                            phoneB,
                            missionaries,
                            photo.replace('data:image/png;base64,', '').replace(/^"|"$/g, ''),
                            encodedNote,
                            area.zone
                        );

                        vcfOutput.push(card.replace(/^\s{4}/gm, '').trim());
                    });

                    vcfOutput = vcfOutput.join('\n\n\n');

                    fs.writeFileSync(savePath, vcfOutput);

                    showMessage('Generated contacts file.');
                }
            }]
        });

        this.addElement(button);
    }
}
