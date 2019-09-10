const elios_sdk = require('elios-sdk');
const sdk = new elios_sdk.default();

var Imap = require('imap'),
    cheerio = require('cheerio'),
    html = require('./index.html'),
    simpleParser = require("mailparser").simpleParser,
    credentials = require("../resources/credentials.json");
    // {google} = require('googleapis');

const $ = cheerio.load(html);

export default class Email {
    name: string = 'Email';
    installId: string = '';

    requireVersion: string = '0.0.1';
    showOnStart: boolean = true;

    widget: any;
    it: any;

    dom: any;

    mails: any = {};

    imap = new Imap({
        user: credentials.Outlook.client_mail,
        password: credentials.Outlook.client_password,
        host: credentials.Outlook.imap_server,
        port: 993,
        tls: true
    });


    constructor() {
        console.log('Construtor');        
    }

    init() {
        console.log('MODULE DEV LOADED ' + this.name);
    }

    openInbox = (cb: Function) => {
        this.imap.openBox('INBOX', true, this.getLatestMails);
    }

    connect = () => {
        this.imap.connect();
    }

    getLatestMails = (box: any) => {
      let date = new Date();

      date.setDate(date.getDate() - 7);

      this.imap.search([ 'UNSEEN', ['SINCE', date.toDateString()] ], (err: any, results: any) => {
        if (err) throw err;
        let array: Array<Number> = [];

        for (let index = 0; index < results.length; index++) {
          if (index >= results.length - 3)
            array.splice(0, 0, results[index]);
        }

        var f = this.imap.fetch(array, {
          bodies: '',
          struct: true
        });
          f.on('message', (msg: any, seqno: any) => {
            var prefix = '(#' + seqno + ') ';
            msg.on('body', (stream: any, info: any) => {
              var buffer = '';
              stream.on('data', function(chunk: any) {
                buffer += chunk.toString('utf8');
              });
              stream.once('end', () => {
                simpleParser(buffer, (err: any, parsed: any) => {

                  this.mails[seqno] = parsed;

                  let elem = $('<li" class="mail_minimised"></li>');
                  $(elem).data("seqno", seqno);
                  if (parsed.headers.has("subject")) {
                    $(elem).append('<div class="subject_minimised">' + parsed.headers.get("subject") + '</div>')
                  }
                  if (parsed.headers.has("from")) {
                    $(elem).append('<div class="from_minimised">' + parsed.headers.get("from").value[0].name + '</div>')
                  }
                  $('#latest_mails').prepend(elem);
                  
                  this.widget.html($('#card_imap_list').html());
                });
              });
            });
            // msg.once('attributes', function(attrs: any) {
            //   console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
            // });
            msg.once('end', function() {
              console.log(prefix + 'Finished');
            });
          });

        f.once('error', function(err: any) {
          console.log('Fetch error: ' + err);
        });
        f.once('end', () => {
          console.log('Done fetching all messages!');
          console.log($('#card_imap_list').html());
          
          this.widget.html($('#card_imap_list').html());
          this.imap.end();
        });
      });
    }

    mailChosen(element: any) {
      this.displayFullMail($(element).data("seqno"))
    }

    displayFullMail(seqno: any) {
      var mail: any;

      let elem = $('#latest_mails li')
      elem.forEach((element: any) => {
        if ($(element).data("seqno") == seqno) {
          mail = this.mails[$(element).data("seqno")];
        } 
      });

      if (mail != undefined) {
        $('#card_imap_mail_display .card_imap').prepend(mail.html);
        this.widget.html($('#card_imap_mail_display').html());  
      }
    }

    start() {
        console.log('MODULE STARTED ' + this.name);
        this.widget = sdk.createWidget({
          id: this.installId
        });

        this.widget.html($('#card_imap_auth').html());
        // $('#button_connect_auth').attr('onclick', '');



        this.imap.once('ready', () => {
            this.openInbox((err: any, box: any) => {
              if (err) throw err;
              this.getLatestMails(box);
            });
          });
          
        this.imap.once('error', (err: any) => {
          console.log(err);
        });
          
        this.imap.once('end', function() {
          console.log('Connection ended');
        });


        // this.imap.connect();

        // var oauth2Client = new google.auth.OAuth2(
        //   credentials.GMail.client_id,
        //   credentials.GMail.client_secret,
        //   credentials.GMail.redirect_uris
        // );
         
        // const url = oauth2Client.generateAuthUrl({
        //   // 'online' (default) or 'offline' (gets refresh_token)
        //   access_type: 'offline',
        
        //   // If you only need one scope you can pass it as a string
        //   scope: 'https://www.googleapis.com/auth/gmail.readonly'
        // });

        // let authWindow = new BrowserWindow({
        //   width: 800,
        //   height: 600,
        //   autoHideMenuBar: true,
        //   webPreferences: {
        //     nodeIntegration: false
        //   }
        // })

        // authWindow.webContents.on('will-navigate', (e, url) => {
        //   const matched = url.match(/\?oauth_token=([^&]*)&oauth_verifier=([^&]*)/)
  
        //   if (matched) {
        //     e.preventDefault()
  
        //     console.log("THIS IS CONSENT", e, url)                
        //     if (authWindow) {
        //         authWindow.close()
        //     }
        //   }
        // })
  
        // authWindow.loadURL(url)


        // console.log("GMAIL URL: ", url)
    }

    stop() {
        console.log('MODULE STOPED ' + this.name);
    }
}

const email = new Email();

email.start();
