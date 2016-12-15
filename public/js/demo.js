'use strict';

$(document).ready(function() {

  var demo = {
    getTooltip : undefined // Loaded later
  };

  i18nProvider.getJson('json', 'tooltipdata',
    function(tooltipdata) {
      demo.getTooltip = i18nTranslatorFactory.createTranslator(tooltipdata);
    }
  );

  var MIN_WORDS = 100;

  var widgetId = 'vizcontainer', // Must match the ID in index.jade
    widgetWidth = 700, widgetHeight = 700, // Default width and height
    personImageUrl = 'images/app.png', // Can be blank
    language = 'en'; // language selection

  // Jquery variables
  var $content = $('.content'),
    $loading   = $('.loading'),
    $error     = $('.error'),
    $errorMsg  = $('.errorMsg'),
    $traits    = $('.traits'),
    $results   = $('.results'),
    $captcha   = $('.captcha'),
    $selftraits= $('.self-traits'),
    $seldbadtraits = $('.self-badtraits'), 
    $badtraits = $('.badtraits') ; 

  /**
   * Clear the "textArea"
   */
  $('.clear-btn').click(function(){
    $('.clear-btn').blur();
    $content.val('');
    updateWordsCount();
  });

  /**
   * Update words count on change
   */
  $content.change(updateWordsCount);

  /**
   * Update words count on copy/past
   */
  $content.bind('paste', function() {
    setTimeout(updateWordsCount, 100);
  });

  /**
   * 1. Create the request
   * 2. Call the API
   * 3. Call the methods to display the results
   */
  $('.analysis-btn').click(function(){
    $('.analysis-btn').blur();

    // check if the captcha is active and the user complete it
    var recaptcha = grecaptcha.getResponse();

    // reset the captcha
    grecaptcha.reset();

    if ($captcha.css('display') === 'table' && recaptcha === '')
      return;


    $loading.show();
    $captcha.hide();
    $error.hide();
    $traits.hide();
    $badtraits.hide() ; 
    $results.hide();

    $.ajax({
      headers:{
        'csrf-token': $('meta[name="ct"]').attr('content')
      },
      type: 'POST',
      data: {
        recaptcha: recaptcha,
        text: $content.val(),
        language: language
      },
      url: '/api/profile',
      dataType: 'json',
      success: function(response) {
        $loading.hide();

        if (response.error) {
          showError(response.error);
        } else {
          $results.show();
          showOtherTraits(response.others); 
          showSelfTraits(response.self); 
          showTextSummary(response.self);
        }

      },
      error: function(xhr) {
        $loading.hide();

        var error;
        try {
          error = JSON.parse(xhr.responseText || {});
        } catch(e) {}

        if (xhr && xhr.status === 429){
          $captcha.css('display','table');
          $('.errorMsg').css('color','black');
          error.error = 'Complete the captcha to proceed';
        } else {
          $('.errorMsg').css('color','red');
        }

        showError(error ? (error.error || error): '');
      }
    });
  });

  /**
   * Display an error or a default message
   * @param  {String} error The error
   */
  function showError(error) {
    var defaultErrorMsg = 'Error processing the request, please try again later.';
    $error.show();
    $errorMsg.text(error || defaultErrorMsg);
  }


  function showTrait (elem , table, property){
        console.log(elem) ; 
        var Klass = 'row';
        Klass += (elem.title) ? ' model_title' : ' model_trait';
        Klass += (elem.value === '') ? ' model_name' : '';

        if (elem.value !== '') { // Trait child name
          $('#'+property+'trait-template').clone()
          .attr('class', Klass)
          .find('.tname')
          .find('span').html(elem.id).end()
          .end()
          .find('.tvalue')
          .find('span').html(elem.value === '' ?  '' : elem.value)
          .end()
          .end()
          .appendTo(table);
        } else {
          // Model name
          $('#model-template').clone()
          .attr('class', Klass)
          .find('.col-lg-12')
          .find('span').html(elem.id).end()
          .end()
          .appendTo(table);
        }
  }

  /**
   * Displays the traits received from the
   * Personality Insights API in a table,
   * just trait names and values.
   */

function filterTraits (traitList , table , badtable, property) {
  for (var i = 0; i < traitList.length; i++) {
    var elem = traitList[i];
    if (elem.id === "Dutifulness" || elem.id === "Orderliness" || elem.id === "Self-discipline" ||  elem.id === "Stability" || elem.id === "Cautiousness")
      showTrait(elem , table, property) ; 
    else if (elem.id === "Uncompromising" || elem.id === "Immoderation" || elem.id === "Hedonism")
      showTrait(elem,badtable, property) ; 
  }
}
function showOtherTraits (data){
  $traits.show();
  $badtraits.show() ; 
  var traitList = flatten(data.tree); 
  var table = $traits;
  var badtable = $badtraits ; 
  table.empty();
  badtable.empty() ; 
  filterTraits (traitList , table , badtable, "") ; 

}
function showSelfTraits (data){
  $selftraits.show() ; 
  $seldbadtraits.show() ; 
  var traitList = flatten(data.tree); 
  var table = $selftraits ; 
  var badtable = $seldbadtraits ;
  table.empty();
  badtable.empty() ; 
  filterTraits (traitList , table , badtable, "self-") ; 

}


  /**
   * Returns a 'flattened' version of the traits tree, to display it as a list
   * @return array of {id:string, title:boolean, value:string} objects
   */
  function flatten( /*object*/ tree) {
    var arr = [],
      f = function(t, level) {
        if (!t) return;
        if (level > 0 && (!t.children || level !== 2)) {
          arr.push({
            'id': t.name,
            'title': t.children ? true : false,
            'value': (typeof (t.percentage) !== 'undefined') ? Math.floor(t.percentage * 100) + '%' : '',
            'sampling_error': (typeof (t.sampling_error) !== 'undefined') ? Math.floor(t.sampling_error * 100) + '%' : ''
          });
        }
        if (t.children && t.id !== 'sbh') {
          for (var i = 0; i < t.children.length; i++) {
            f(t.children[i], level + 1);
          }
        }
      };
    f(tree, 0);
    return arr;
  }

	function showTextSummary(data) {
		console.log('showTextSummary()');
		var paragraphs = textSummary.assemble(data.tree);
		var div = $('.summary-div');
		$('.outputMessageFootnote').text(data.word_count_message ? '**' + data.word_count_message + '.' : '');
		div.empty();
		paragraphs.forEach(function(sentences) {
		$('<p></p>').text(sentences.join(' ')).appendTo(div);
		});
	}

  function updateWordsCount() {
    var text = $content.val();
    var wordsCount = text.match(/\S+/g) ? text.match(/\S+/g).length : 0;
    $('.wordsCountFootnote').css('color',wordsCount < MIN_WORDS ? 'red' : 'gray');
    $('.wordsCount').text(wordsCount);
  }


  //onSampleTextChange();
  $content.keyup(updateWordsCount);
  //$('.sample-radio').change(onSampleTextChange);
});
