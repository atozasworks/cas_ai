import React, { useState, useEffect } from "react";
import "./AboutLegal.css";

const AboutLegal = ({ open, onClose, initialView = null }) => {
  const [currentView, setCurrentView] = useState(initialView); // null, 'license', 'privacy', 'terms'

  // Update currentView when initialView prop changes
  useEffect(() => {
    if (open && initialView) {
      setCurrentView(initialView);
    } else if (!open) {
      setCurrentView(null);
    }
  }, [open, initialView]);

  if (!open) return null;

  const stopClick = (event) => {
    event.stopPropagation();
  };

  const handleBack = () => {
    // If viewing Privacy Policy or Terms of Use, close modal and navigate to landing page
    if (currentView === 'privacy' || currentView === 'terms') {
      if (onClose) {
        onClose();
      }
    } else {
      // For other views (like license), just go back to main view
      setCurrentView(null);
    }
  };

  // Helper function to format markdown-like content to JSX
  const formatContent = (content) => {
    const lines = content.split('\n');
    const elements = [];
    let inList = false;
    let listItems = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        if (inList && listItems.length > 0) {
          elements.push(<ul key={`list-${index}`} style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<br key={`br-${index}`} />);
      } else if (trimmed.startsWith('# ')) {
        if (inList) {
          elements.push(<ul key={`list-${index}`} style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<h1 key={`h1-${index}`} style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '1.8em', borderBottom: '3px solid #3498db', paddingBottom: '10px' }}>{trimmed.substring(2)}</h1>);
      } else if (trimmed.startsWith('## ')) {
        if (inList) {
          elements.push(<ul key={`list-${index}`} style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<h2 key={`h2-${index}`} style={{ color: '#34495e', marginTop: '30px', marginBottom: '15px', fontSize: '1.5em' }}>{trimmed.substring(3)}</h2>);
      } else if (trimmed.startsWith('### ')) {
        if (inList) {
          elements.push(<ul key={`list-${index}`} style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<h3 key={`h3-${index}`} style={{ color: '#555', marginTop: '20px', marginBottom: '10px', fontSize: '1.2em' }}>{trimmed.substring(4)}</h3>);
      } else if (trimmed.startsWith('> ')) {
        if (inList) {
          elements.push(<ul key={`list-${index}`} style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<blockquote key={`blockquote-${index}`} style={{ borderLeft: '4px solid #3498db', paddingLeft: '20px', margin: '20px 0', color: '#666', fontStyle: 'italic' }}>{trimmed.substring(2)}</blockquote>);
      } else if (trimmed.startsWith('- ')) {
        inList = true;
        const itemText = trimmed.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        listItems.push(<li key={`li-${index}`} dangerouslySetInnerHTML={{ __html: itemText }} />);
      } else if (trimmed.startsWith('---')) {
        if (inList) {
          elements.push(<ul key={`list-${index}`} style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<hr key={`hr-${index}`} style={{ border: 'none', borderTop: '2px solid #eee', margin: '30px 0' }} />);
      } else if (/^\d+\./.test(trimmed)) {
        if (inList) {
          elements.push(<ul key={`list-${index}`} style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<h3 key={`h3-${index}`} style={{ color: '#555', marginTop: '20px', marginBottom: '10px', fontSize: '1.2em' }}>{trimmed}</h3>);
      } else {
        if (inList) {
          elements.push(<ul key={`list-${index}`} style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        const formattedText = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(<p key={`p-${index}`} style={{ marginBottom: '12px', textAlign: 'justify' }} dangerouslySetInnerHTML={{ __html: formattedText }} />);
      }
    });

    if (inList && listItems.length > 0) {
      elements.push(<ul key="list-final" style={{ marginLeft: '20px', marginBottom: '15px' }}>{listItems}</ul>);
    }

    return elements;
  };

  // Get document content based on current view
  const getDocumentContent = () => {
    if (currentView === 'license') {
      const licenseContent = `GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/> Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.

The GNU General Public License is a free, copyleft license for software and other kinds of works.

The licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast,the GNU General Public License is intended to guarantee your freedom to 
share and change all versions of a program--to make sure it remains free software for all its users. We, the Free Software Foundation, use the GNU General Public License for most of our software; it applies also to
any other work released this way by its authors. You can apply it to your programs, too.

When we speak of free software, we are referring to freedom, not price. Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software 
(and charge for them if you wish), that you receive source code or can get  it if you want it, that you can change the software or use pieces of it in new free programs, and that you know you can do these things.

To protect your rights, we need to prevent others from denying you these rights or asking you to surrender the rights. Therefore, you have certain responsibilities if you distribute copies of the software, or if you modify it: responsibilities to respect the freedom of others.

For example, if you distribute copies of such a program, whether gratis or for a fee, you must pass on to the recipients the same freedoms that you received. You must make sure that they, too, receive or can get the source code. And you must show them these terms so they know their rights.

Developers that use the GNU GPL protect your rights with two steps:
(1) assert copyright on the software, and (2) offer you this License giving you legal permission to copy, distribute and/or modify it.

For the developers' and authors' protection, the GPL clearly explains that there is no warranty for this free software. For both users' and authors' sake, the GPL requires that modified versions be marked as changed, so that their problems will not be attributed erroneously to authors of previous versions.

Some devices are designed to deny users access to install or run modified versions of the software inside them, although the manufacturer can do so. This is fundamentally incompatible with the aim of protecting users' freedom to change the software. The systematic pattern of such abuse occurs in the area of products for individuals to use, which is precisely where it is most unacceptable. Therefore, we have designed this version of the GPL to prohibit the practice for those products. If such problems arise substantially in other domains, we stand ready to extend this provision to those domains in future versions of the GPL, as needed to protect the freedom of users.

Finally, every program is threatened constantly by software patents. States should not allow patents to restrict development and use of
software on general-purpose computers, but in those that do, we wish to avoid the special danger that patents applied to a free program could
make it effectively proprietary. To prevent this, the GPL assures that patents cannot be used to render the program non-free.

The precise terms and conditions for copying, distribution and modification follow.

TERMS AND CONDITIONS

0. Definitions.

"This License" refers to version 3 of the GNU General Public License.

"Copyright" also means copyright-like laws that apply to other kinds of works, such as semiconductor masks.

"The Program" refers to any copyrightable work licensed under this License. Each licensee is addressed as "you". "Licensees" and "recipients" may be individuals or organizations.

To "modify" a work means to copy from or adapt all or part of the work in a fashion requiring copyright permission, other than the making of an exact copy. The resulting work is called a "modified version" of the earlier work or a work "based on" the earlier work. 

A "covered work" means either the unmodified Program or a work based on the Program.

To "propagate" a work means to do anything with it that, without permission, would make you directly or secondarily liable for
infringement under applicable copyright law, except executing it on a computer or modifying a private copy. Propagation includes copying,
distribution (with or without modification), making available to the public, and in some countries other activities as well.

To "convey" a work means any kind of propagation that enables other parties to make or receive copies. Mere interaction with a user through
a computer network, with no transfer of a copy, is not conveying.

An interactive user interface displays "Appropriate Legal Notices" to the extent that it includes a convenient and prominently visible
feature that (1) displays an appropriate copyright notice, and (2) tells the user that there is no warranty for the work (except to the
extent that warranties are provided), that licensees may convey the  work under this License, and how to view a copy of this License. If
the interface presents a list of user commands or options, such as a menu, a prominent item in the list meets this criterion.

1. Source Code.

The "source code" for a work means the preferred form of the work for making modifications to it. "Object code" means any non-source form of a work.

A "Standard Interface" means an interface that either is an official standard defined by a recognized standards body, or, in the case of interfaces specified for a particular programming language, one that
is widely used among developers working in that language.

The "System Libraries" of an executable work include anything, other than the work as a whole, that (a) is included in the normal form of
packaging a Major Component, but which is not part of that Major Component, and (b) serves only to enable use of the work with that
Major Component, or to implement a Standard Interface for which an implementation is available to the public in source code form. A
"Major Component", in this context, means a major essential component (kernel, window system, and so on) of the specific operating system
(if any) on which the executable work runs, or a compiler used to produce the work, or an object code interpreter used to run it.

The "Corresponding Source" for a work in object code form means all the source code needed to generate, install, and (for an executable
work) run the object code and to modify the work, including scripts to control those activities. However, it does not include the work's
System Libraries, or general-purpose tools or generally available free programs which are used unmodified in performing those activities but
which are not part of the work. For example, Corresponding Source includes interface definition files associated with source files for
the work, and the source code for shared libraries and dynamically linked subprograms that the work is specifically designed to require,
such as by intimate data communication or control flow between those subprograms and other parts of the work.

The Corresponding Source need not include anything that users can regenerate automatically from other parts of the Corresponding Source.

The Corresponding Source for a work in source code form is that same work.

2. Basic Permissions.

All rights granted under this License are granted for the term of copyright on the Program, and are irrevocable provided the stated conditions are met. This License explicitly affirms your unlimited permission to run the unmodified Program. The output from running a
covered work is covered by this License only if the output, given its content, constitutes a covered work. This License acknowledges your rights of fair use or other equivalent, as provided by copyright law.

You may make, run and propagate covered works that you do not convey, without conditions so long as your license otherwise remains
in force. You may convey covered works to others for the sole purpose of having them make modifications exclusively for you, or provide you
with facilities for running those works, provided that you comply with the terms of this License in conveying all material for which you do
not control copyright. Those thus making or running the covered works for you must do so exclusively on your behalf, under your direction
and control, on terms that prohibit them from making any copies of your copyrighted material outside their relationship with you.

Conveying under any other circumstances is permitted solely under the conditions stated below. Sublicensing is not allowed; section 10 makes it unnecessary.

[This is a summary. The full license contains many more sections covering patents, termination, warranty disclaimers, and other legal matters.]

3. Disclaimer of Warranty.

THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT
HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM
IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

4. Limitation of Liability.

IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS
THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE
USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD
PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

END OF TERMS AND CONDITIONS

For the complete text of the GNU General Public License version 3,
please visit: https://www.gnu.org/licenses/gpl-3.0.html`;
      return { title: 'GNU General Public License v3', content: licenseContent };
    } else if (currentView === 'privacy') {
      const privacyContent = `# Privacy Policy

## 1. Introduction
This Privacy Policy describes how **AtoZ Automation Solutions Pvt. Ltd.** ("AtoZ", "we", "us", "our") collects, uses, stores, and protects personal data when you use our GPS-based collision avoidance application and related services (the "Service").
By using the Service, you agree to the collection and use of information in accordance with this policy.
---
## 2. Data We Collect
### 2.1 Account & Identification Data
- Name (e.g. driver or user name).
- Phone number or contact details (if required for registration).
- Vehicle identifiers (e.g. vehicle ID, registration number).

### 2.2 Location & Device Data
- GPS location (latitude, longitude).
- Speed and heading (where supported).
- Timestamps associated with location data.
- Device information (e.g. device type, operating system, app version).

### 2.3 Usage & Event Data
- Application events related to:
  - Collision warnings and alerts.
  - Start/stop of location tracking.
  - Feature usage patterns (e.g. dashboard views, map interactions).
---
## 3. Purpose and Legal Basis of Processing
We process personal data for the following purposes:
- To provide the core Service:
  - Real-time collision risk alerts.
  - Vehicle tracking and situational awareness.
- To maintain and improve the Service:
  - Troubleshooting and performance monitoring.
  - Algorithm and model improvements.
- To ensure security and prevent misuse:
  - Detecting and preventing fraud or unauthorized use.
  - Monitoring anomalies (e.g. impossible speeds or spoofed locations).

Where required by law (e.g. GDPR, DPDP):
- We rely on **your consent** for continuous GPS and background location tracking.
- We may rely on **legitimate interests** to process limited telemetry for:
  - System security and reliability.
  - Aggregated analytics (e.g. non-identifiable traffic patterns).
---
## 4. Consent and User Controls
- The app will request permission to access your location (foreground and, if applicable, background).
- You can:
  - Enable or disable location tracking via app settings.
  - Revoke location permissions through your device's OS settings.
- Where required, we will:
  - Provide a clear notice describing how and why location data is used.
  - Obtain explicit consent before starting continuous tracking.
If you withdraw consent or disable tracking, some or all collision avoidance features may not function.
---
## 5. Data Retention
- Raw high-frequency GPS data:
  - Retained for only as long as necessary for:
    - Providing the Service,
    - Safety investigations,
    - Debugging, and
    - Compliance with legal obligations.
  - After that, it may be:
    - Anonymized or aggregated, or
    - Deleted.
- Aggregated and anonymized data:
  - May be retained for longer periods for analytics, research, and improving road safety.

Specific retention periods may vary based on configuration, contract terms, and legal requirements.
---
## 6. Data Sharing and Disclosure
We may share personal data with:
- **Service Providers**:
  - Hosting providers, database services, analytics, and monitoring tools.
  - These providers process data only on our instructions and under appropriate data processing agreements.
- **Authorized Entities (e.g. Fleets or Organizations)**:
  - If the Service is provided through your employer, fleet manager, or organization, they may receive access to relevant data as part of the agreed functionality (e.g. fleet dashboards).
- **Legal and Regulatory Authorities**:
  - When required by law, regulation, or valid legal process.
We do **not** sell personally identifiable location data to third parties for advertising or unrelated commercial purposes.
---
## 7. International Data Transfers
If data is transferred outside of your country (for example, to cloud data centers), we will:
- Use appropriate safeguards (e.g. standard contractual clauses, adequacy decisions) where required by data protection laws.
- Ensure that service providers offer adequate data protection standards.
---
## 8. Data Security
We implement reasonable technical and organizational measures to protect personal data, including:
- Encryption in transit (HTTPS / TLS).
- Access controls and authentication.
- Firewalls and secure server configuration.
- Monitoring and logging for suspicious activity.
Despite these safeguards, no system can be completely secure, and we cannot guarantee absolute security.
---
## 9. Your Rights
Depending on your jurisdiction (including GDPR and India's DPDP Act 2023), you may have rights such as:
- Access – to obtain a copy of your personal data.
- Rectification – to correct inaccurate or incomplete data.
- Erasure – to request deletion of your personal data (subject to legal obligations).
- Restriction – to request limited processing in certain circumstances.
- Portability – to receive your data in a structured, commonly used format.
- Objection – to object to certain types of processing (e.g. direct marketing, some legitimate interest uses).
- Withdrawal of consent – where processing is based on consent.
To exercise any of these rights, contact us using the details provided below.
---
## 10. Children's Privacy
If the Service is used for minors (e.g. school transportation tracking), we will:
- Comply with applicable laws on children's data.
- Where required, obtain **verifiable parental or guardian consent**.
If you believe we have collected personal data from a child without appropriate consent, please contact us so we can take appropriate action.
---
## 11. Contact and Grievance Redressal
If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact:
- **Email**: [Insert official privacy contact email]
- **Postal address**: [Insert registered office address of AtoZ Automation Solutions Pvt. Ltd.]
Where required by law (e.g. DPDP Act), we may designate a **Data Protection Officer** or **Grievance Officer**; their contact details will be made available on the official website and/or updated in this document.
---
## 12. Changes to This Policy
We may update this Privacy Policy from time to time. When we do:
- We will revise the "Last Updated" date below.
- Where required, we will notify users through the app or other appropriate channels.
**Last Updated:** [01-12-2025]`;
      return { title: 'Privacy Policy', content: privacyContent };
    } else if (currentView === 'terms') {
      const termsContent = `# Terms of Use
 
## 1. Introduction
These Terms of Use ("Terms") govern your access to and use of the GPS-based collision avoidance application and services (the "Service") provided by **AtoZ Automation Solutions Pvt. Ltd.** ("AtoZ", "we", "us", "our").
By using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
---
## 2. Service Description
The Service aims to:
- Receive real-time GPS location and related data from user devices or vehicles.
- Analyze proximity, movement, and other factors to provide **collision warnings** and **safety alerts**.
- Provide dashboards or interfaces for users, fleet managers, or organizations to monitor vehicles and safety events.
The Service is intended as an **assistive tool** and **does not replace**:
- Safe driving practices.
- Compliance with traffic laws and regulations.
---
## 3. Eligibility and User Obligations
To use the Service, you must:
- Have the legal capacity to enter into these Terms.
- Use the Service only for lawful purposes.

You agree to:
- Obey all applicable traffic, road safety, and mobile device usage laws.
- Not rely solely on the Service to prevent collisions or harm.
- Ensure that any device running the app is used in a manner that does not distract the driver or violate local regulations.
---
## 4. Safety and Disclaimer
- The Service is **not** a certified safety or emergency system.
- Alerts may be delayed, incomplete, inaccurate, or may fail to trigger in time.

You acknowledge and agree that:
- AtoZ Automation Solutions Pvt. Ltd. does not guarantee that all collisions or dangerous situations will be detected or avoided.
- The driver is always responsible for:  Maintaining control of the vehicle.
  - Observing surroundings and following traffic rules.
  - Making safe driving decisions, regardless of any alerts or suggestions from the Service.
---
## 5. Acceptable Use
You must **not**:
- Use the Service to track individuals without their knowledge or legal basis.
- Use the Service in any way that violates privacy, harassment, or stalking laws.
- Reverse engineer, decompile, or attempt to derive the source code of components that are not provided under an open-source license.
- Use the Service for unlawful or dangerous activities.
If you are using the Service on behalf of an organization (e.g. fleet operator, school, company), you are responsible for ensuring that:
- Appropriate notices and consents are provided to drivers and affected individuals.
- The Service is configured and used in compliance with applicable law.
---
## 6. Intellectual Property
- The open-source portions of the Service are licensed under the license described in \`LICENSE\`.
- AtoZ Automation Solutions Pvt. Ltd. and/or its licensors retain ownership of all underlying intellectual property, including trade names, trademarks, service marks, and logos.
You may not use the AtoZ name, logo, or branding in a way that suggests endorsement or affiliation without prior written permission, except as allowed by any published trademark policy.
---
## 7. Privacy
Your use of the Service is also governed by our PRIVACY_POLICY, which describes how we collect, use, and protect personal data (including GPS location data).
By using the Service, you acknowledge that you have read and understood the Privacy Policy.
---
## 8. Availability and Modifications

We may:
- Modify, suspend, or discontinue the Service (or any part of it) at any time.
- Introduce new features or impose limits on certain features.
We will make reasonable efforts to inform users of significant changes, where practical.
---

## 9. Disclaimers and Limitation of Liability
The Service is provided **"as is"** and **"as available"**, without warranties of any kind, whether express or implied, including but not limited to:
- Fitness for a particular purpose.
- Non-infringement.
- Accuracy or completeness of location or map data.

To the maximum extent permitted by law:
- AtoZ Automation Solutions Pvt. Ltd, its affiliates, officers, employees, and agents will not be liable for:
  - Any indirect, incidental, special, consequential, or punitive damages.
  - Any loss of life, injury, property damage, or traffic violations alleged to have arisen from the use or inability to use the Service.
- Where liability cannot be excluded, it may be limited:
  - To the amount you paid (if any) for the Service during a specified period prior to the claim, or
  - To another cap permitted by applicable law.
---

## 10. Indemnification
You agree to indemnify and hold harmless AtoZ and its affiliates from and against any claims, liabilities, damages, losses, and expenses (including legal fees) arising out of or in connection with:
- Your use of the Service.
- Your violation of these Terms.
- Your violation of any law or rights of a third party (including privacy or data protection rights).
---

## 11. Governing Law and Dispute Resolution
Unless otherwise required by law:
- These Terms are governed by the laws of India.
- Any disputes arising out of or related to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts located in NEW DELHI.
You should update this section to match the registered office and preferred legal jurisdiction for AtoZ Automation Solutions Pvt. Ltd.

---

## 12. Changes to These Terms
We may update these Terms from time to time. When we do:
- We will revise the "Last Updated" date below.
- Where required, we may notify users via the app, email, or other appropriate means.
If you continue to use the Service after the updated Terms take effect, you agree to be bound by the revised Terms.

**Last Updated:** [01-12-2025]`;
      return { title: 'Terms of Use', content: termsContent };
    }
    return null;
  };

  // Function to open LICENSE
  const openLicense = (e) => {
    e.preventDefault();
    setCurrentView('license');
  };

  // Function to open Privacy Policy
  const openPrivacyPolicy = (e) => {
    e.preventDefault();
    setCurrentView('privacy');
  };

  // Function to open Terms of Use
  const openTermsOfUse = (e) => {
    e.preventDefault();
    setCurrentView('terms');
  };

  const documentData = getDocumentContent();

  // If viewing a document, show document view
  if (currentView && documentData) {
    return (
      <div className="about-legal-overlay" onClick={onClose}>
        <div className="about-legal-modal" onClick={stopClick} style={{ maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
          <button
            className="about-legal-close"
            type="button"
            onClick={onClose}
            aria-label="Close about and legal information"
          >
            ×
          </button>
          <button
            type="button"
            onClick={handleBack}
            style={{
              marginBottom: '15px',
              padding: '8px 16px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back
          </button>
          <div style={{ padding: '10px 0' }}>
            {formatContent(documentData.content)}
          </div>
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="about-legal-overlay" onClick={onClose}>
      <div className="about-legal-modal" onClick={stopClick}>
        <button
          className="about-legal-close"
          type="button"
          onClick={onClose}
          aria-label="Close about and legal information"
        >
          ×
        </button>

        <h2>About &amp; Legal</h2>
        <p className="about-legal-intro">
          This application is part of the AtoZ Vehicle Collision Avoidance
          System, a GPS-based collision warning and proximity alert platform.
        </p>

        <section className="about-legal-section">
          <h3>License</h3>
          <p>
            This program is free software: you can redistribute it and/or modify
            it under the terms of the{" "}
            <strong>GNU General Public License</strong> as published by the Free
            Software Foundation, either version 3 of the License, or (at your
            option) any later version.
          </p>
          <p>
            It is distributed in the hope that it will be useful, but{" "}
            <strong>without any warranty</strong>; without even the implied
            warranty of merchantability or fitness for a particular purpose. See
            the GNU General Public License for more details.
          </p>
        </section>

        <section className="about-legal-section">
          <h3>Privacy &amp; Terms</h3>
          <p>
            By using this application you agree to the applicable privacy and
            terms documents for this deployment. These documents explain how
            GPS/location data is collected, how it is used to provide collision
            warnings, and what your responsibilities are when using the app.
          </p>
          <ul className="about-legal-links">
            <li>
              <a
                href="#"
                onClick={openLicense}
                style={{ cursor: 'pointer' }}
              >
                View GNU GPL License
              </a>
            </li>
            {/* <li>
              <a
                href="#"
                onClick={openPrivacyPolicy}
                style={{ cursor: 'pointer' }}
              >
                View Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="#"
                onClick={openTermsOfUse}
                style={{ cursor: 'pointer' }}
              >
                View Terms of Use
              </a>
            </li> */}
          </ul>
        </section>

        <div className="about-legal-github-consent">
          <label>
            <input
              type="checkbox"
              onChange={(event) => {
                if (event.target.checked) {
                  const githubUrl =
                    "https://github.com/atozats/vehiclecollision";
                  window.open(githubUrl, "_blank", "noopener,noreferrer");
                  if (onClose) {
                    onClose();
                  }
                }
              }}
            />
            <span>
              I have read and understood the above information. Take me to the
              GitHub repository.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AboutLegal;
