<head>
    <style>
      .resultRow {
        display: flex;
        justify-content: space-around;
      }
  
      .resultRow > h1 {
        flex: 1;
        text-align: center;
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script type="text/javascript">
      document.addEventListener('DOMContentLoaded', function() {
        const findButton = document.querySelector('a.findbutton.w-button');
        findButton.addEventListener('click', () => handleFindButtonClick());
  
        const importButton = document.querySelector('a.importcsv.w-button');
        importButton.addEventListener('click', handleImportButtonClick);
  
        const exportButton = document.querySelector('a.exportcsv.w-button');
        exportButton.addEventListener('click', handleExportButtonClick);
      });
  
      function handleImportButtonClick(event) {
        event.preventDefault();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.addEventListener('change', handleFileSelect);
        input.click();
      }
  
      function handleFileSelect(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
          const contents = e.target.result;
          const lines = contents.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const [domain] = lines[i].split(',');
            await handleFindButtonClick(domain);
          }
        };
        reader.readAsText(file);
      }
  
      function handleExportButtonClick(event) {
        event.preventDefault();
  
        const emailH1s = document.querySelectorAll('.verifiedemail');
        const emails = Array.from(emailH1s).map(h1 => h1.innerText.trim());
  
        const filteredEmails = emails.filter(email => email !== 'No Email Found');
  
        const csvContent = filteredEmails.join('\n');
        const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
  
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'verifiedemails.csv');
        link.click();
      }
      
      function getEmailDomain(email) {
        const atIndex = email.lastIndexOf('@');
        if (atIndex !== -1) {
          return email.slice(atIndex + 1);
        }
        return '';
      }
      
  
      
  
      async function handleFindButtonClick(domainInput = null) {
        if (!domainInput) {
          const domainInputField = document.getElementById('Domain');
          domainInput = domainInputField.value;
        }
  
        const url = new URL(domainInput);
        const fullDomain = url.href;
        const cleanedDomain = url.host.replace(/^www\./, '');
  
        const domainMatchCheckbox = document.querySelector('input[id="domainmatchcheckbox"]').checked;
        const authorCheckBox = document.querySelector('input[id="AuthorCheckBox"]').checked;
  
        let emailVariations;
        let firstName, lastName;
  
        if (authorCheckBox) {
          const response = await runAxios();
          if (response.data && response.data.article) {
            const author = response.data.article.author;
            console.log("AUTHOR", author);
            if (author === false) {
              emailVariations = getBasicEmailVariations(cleanedDomain);
            } else if (author && typeof author === 'string' && author.includes(' ')) {
              [firstName, lastName] = author.split(' ');
              emailVariations = getEmailVariations(cleanedDomain, firstName, lastName);
            } else {
              firstName = author;
              lastName = '';
              emailVariations = getEmailVariations(cleanedDomain, firstName, lastName);
            }
          } else {
            emailVariations = getBasicEmailVariations(cleanedDomain);
          } 
        } else {
          emailVariations = getBasicEmailVariations(cleanedDomain);
        }
  
        const options = {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': 'a84f371f1amsh0746443f1cc6650p1d12e3jsn81e211b2d833',
            'X-RapidAPI-Host': 'emailbounceapi.p.rapidapi.com'
          }
        };
  
        let validEmailFound = false;
        for (let i = 0; i < emailVariations.length; i++) {
          const bounceApiUrl = `https://emailbounceapi.p.rapidapi.com/email/${emailVariations[i]}`;
          await delay(10000);
          let response;
          let result;
          let retries = 0;
          const maxRetries = 3;
  
          while (true) {
            try {
              response = await fetch(bounceApiUrl, options);
              result = await response.json();
              break;
            } catch (error) {
              console.error("Fetch or JSON conversion error: ", error);
              retries++;
              if (retries >= maxRetries) {
                console.log(`Failed to get a valid response after ${maxRetries} attempts. Skipping email variation ${emailVariations[i]}.`);
                continue;
              }
            }
          }
  
          console.log("Domain Input: ", domainInput);
          console.log("Cleaned Domain: ", cleanedDomain);
  
          if (result.valid && (!domainMatchCheckbox || emailMatchesDomain(emailVariations[i], cleanedDomain))) {
            console.log("Valid Email Found: ", emailVariations[i]);
            updateUI(cleanedDomain, emailVariations[i]);
            validEmailFound = true;
            break;
          }
        }
        
        if (!validEmailFound) {
          const chatUrl = 'https://chatgpt-bing-ai-chat-api.p.rapidapi.com/ask';
          const chatOptions = {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'X-RapidAPI-Key': 'a84f371f1amsh0746443f1cc6650p1d12e3jsn81e211b2d833',
              'X-RapidAPI-Host': 'chatgpt-bing-ai-chat-api.p.rapidapi.com'
            },
            body: JSON.stringify({
              question: `Find the best contact email for ${domainInput}`,
              bing_u_cookie: '1ziihfYVcwEYU91dHNi0RZSQypb8dXt2RBJDQviNZyYQCQOae1GcpmkQ3GlyYykQTUAMeDjXVnqcu-xQ-AN-444mFV6yLA5gdbmQ82VDC4E9byP8B6nK_UVylyINlHbJaBlUsusK7DK0RNdrqO68mnK9LNycP9qRdGB7gl-TEY8NfXfj1EEbEWUtehmHrRwithvVeWI2f3RIvPxXQtM0CJg'
            })
          };
    
          const chatResponse = await fetch(chatUrl, chatOptions).catch(console.error);
          const chatResult = await chatResponse.json().catch(console.error);
    
          const responseText = chatResult.text_response;
          const emailMatch = responseText.match(/\*\*(.*?)\*\*/);
          if (emailMatch) {
            const email = emailMatch[1];
            const emailDomain = getEmailDomain(email);
            
            // validate email here     
            const bounceApiUrl = `https://emailbounceapi.p.rapidapi.com/email/${email}`;
                      
            while (true) {
              try {
                response = await fetch(bounceApiUrl, options);
                result = await response.json();
                break;
              } catch (error) {
                console.error("Fetch or JSON conversion error: ", error);
                retries++;
                if (retries >= maxRetries) {
                  console.log(`Failed to get a valid response after ${maxRetries} attempts. Skipping email variation ${emailVariations[i]}.`);
                  continue;
                }
              }
            }
                     
            ///
            
            domainInput = url.host.replace(/^www\./, '');   
            
            if (result.valid && domainmatchcheckbox.checked && emailDomain === domainInput) {
              validEmailFound = true;
              updateUI(domainInput, email);
            } else if (result.valid && !domainmatchcheckbox.checked) {
              validEmailFound = true;
              updateUI(domainInput, email);
            }
          }
    
          if (!validEmailFound) {
            updateUI(domainInput, 'No Email Found');
          }
    
          console.log(chatResult);
        }
      }
  
      function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
  
      function updateUI(domain, email) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'resultRow';
  
        const domainH1 = document.createElement('h1');
        const emailH1 = document.createElement('h1');
  
        domainH1.className = 'domain';
        emailH1.className = 'verifiedemail';
  
        domainH1.innerText = domain;
        emailH1.innerText = email;
  
        rowDiv.appendChild(domainH1);
        rowDiv.appendChild(emailH1);
  
        document.querySelector('div.w-layout-blockcontainer.emailbox.w-container').appendChild(rowDiv);
      }
  
      async function runAxios() {
        const url = document.getElementById('Domain').value;
        const options = {
          method: 'GET',
          url: 'https://lexper.p.rapidapi.com/v1.1/extract',
          params: {
            url: url,
            js_timeout: '30',
            media: 'true'
          },
          headers: {
            'X-RapidAPI-Key': 'a84f371f1amsh0746443f1cc6650p1d12e3jsn81e211b2d833',
            'X-RapidAPI-Host': 'lexper.p.rapidapi.com'
          }
        };
  
        try {
          const response = await axios.request(options);
          console.log('Response Data:', response.data);
          return response;
        } catch (error) {
          console.error(error);
        }
      }
  
      function getEmailVariations(domain, firstName, lastName) {
        return [
          `${firstName}${lastName}@${domain}`,
          `${firstName}.${lastName}@${domain}`,
          `${firstName}_${lastName}@${domain}`,
          `${firstName}${lastName.charAt(0)}@${domain}`,
          `${firstName.charAt(0)}${lastName.charAt(0)}@${domain}`,
          `${firstName.charAt(0)}${lastName}@${domain}`,
          `${firstName.charAt(0)}.${lastName}@${domain}`,
          `${firstName.charAt(0)}_${lastName}@${domain}`,
          `${lastName}${firstName.charAt(0)}@${domain}`,
          `${lastName}.${firstName.charAt(0)}@${domain}`,
          `${lastName}_${firstName.charAt(0)}@${domain}`,
          `${lastName}${firstName}@${domain}`,
          `${lastName}.${firstName}@${domain}`,
          `${lastName}_${firstName}@${domain}`,
          `${firstName}@${domain}`,
          `contact@${domain}`,
          `marketing@${domain}`,
          `sales@${domain}`,
          `info@${domain}`,
          `admin@${domain}`,
          `feedback@${domain}`,
          `support@${domain}`
        ].map(email => email.toLowerCase());
      }
  
      function getBasicEmailVariations(domain) {
        return [
          `contact@${domain}`,
          `marketing@${domain}`,
          `sales@${domain}`,
          `info@${domain}`,
          `admin@${domain}`,
          `feedback@${domain}`,
          `support@${domain}`
        ];
      }
  
      function emailMatchesDomain(email, domain) {
        return email.endsWith(domain);
      }
    </script>
  </head>
  