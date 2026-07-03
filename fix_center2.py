import re

html = open("index.html").read()

def repl(match):
    return """      if (currentLead.status === 'Lost') {
          for (let i = 0; i <= currentIdx; i++) {
              if (stages[i] === 'New') centerContent += renderAccordion('New', renderOutreachStage(true));
              if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderProductSelection(true));
              if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
              if (stages[i] === 'Payment Done') centerContent += renderAccordion('Payment Done', renderPaymentDoneStage(true));
          }
          centerContent += `<div style="padding: 24px; text-align: center; color: #C0392B; font-weight: 600; background: #FEF2F2; border-radius: 8px; margin-top: 16px;">This lead was marked as Lost.</div>`;
      } else {
          for (let i = 0; i < currentIdx; i++) {
              if (stages[i] === 'New') centerContent += renderAccordion('New', renderOutreachStage(true));
              if (stages[i] === 'Contacted') centerContent += renderAccordion('Contacted', renderProductSelection(true));
              if (stages[i] === 'Quote') centerContent += renderAccordion('Quote', renderQuoteStage(true));
              if (stages[i] === 'Payment Done') centerContent += renderAccordion('Payment Done', renderPaymentDoneStage(true));
          }
          
          let activeContent = '';
          if (l.bucket === 'New') { activeContent = renderNewStage(false); } 
          else if (l.bucket === 'Contacted') activeContent = renderProductSelection(false);
          else if (l.bucket === 'Quote') activeContent = renderQuoteStage(false);
          else if (l.bucket === 'Payment Done') activeContent = renderPaymentDoneStage(false);
          else if (l.bucket === 'Policy Issued') activeContent = renderPolicyStage();
          centerContent += activeContent;
      }"""

html = re.sub(r"      if \(currentLead\.status === 'Lost'\) \{.*?\n      \} else \{.*?\n      \}", repl, html, flags=re.DOTALL)

open("index.html", "w").write(html)
