/*
 * Highlighter package for thunderbird
 * Author: André Rodier. <andre.rodier@gmail.com>
 * License: GPL 3.0
 */

var highlighter =
{
    // the name of the last selected color in the format toolbar
    curColor: '',

    // True only after the first initialisation.
    initialised: false,

    // Todo
    clearFormatCalled: false,

    // Each color name is translated in a html code color value
    realColors: {},

    /* Select the next color to use for the next call to the highlight function
    */
    SetCurColor: function(color)
    {
        try
        {
            if ( typeof(color) != "undefined" )
            {
                highlighter.curColor = color;

                // TODO: find a way to use only one icon. Actually, the icon should exists
                // in the pens folder...
                var icon = document.getElementById('highlighter-toolbar-button');
                icon.image = "chrome://highlighter/skin/pens/sel-"+color+".png";
            }
        }
        catch ( exc )
        {
            alert("Exception:\n"+exc.message);
        }
    },


    /* Clear the format of the current selection.
    */
    ClearFormat: function()
    {
        try
        {
            // Remove all the styles from the selection.
            var domndEditor = document.getElementById("content-frame");
            var htmlEditor = domndEditor.getHTMLEditor(domndEditor.contentWindow);

            // The HTML editor.selection is in fact, an object, that is not anymore documented
            // see the doc folder for details
            var selectionObj = htmlEditor.selection;

            // This returns the deepest container of the selection 
            var selectedContainer = htmlEditor.getSelectionContainer();

            // get the text selected from the selection object,
            var textSelected = selectionObj.toString();

            if ( textSelected == '' && selectedContainer )
            {
                // If no text is selected, it means that the cursor is placed inside an already
                // highlighted element, and we want to clear the form of this single element.
                if ( selectedContainer.hasAttribute('style') )
                {
                    var curStyle = selectedContainer.getAttribute("style");
                    var newStyle = curStyle.replace(/background-color:[^;]+;/i, '');

                    if ( newStyle.length > 3 || selectedContainer.nodeName != 'SPAN' )
                    {
                        selectedContainer.setAttribute("style", newStyle);
                    }
                    else
                    {
                        // This is a span with no more style. To avoid pollute,
                        // remove the span itself. The span first child is a text
                        // node that contains it's value. Normally...
                        if ( selectedContainer.firstChild )
                            textSelected = selectedContainer.firstChild.nodeValue;
                        else
                            textSelected = selectedContainer.nodeValue;

                        htmlEditor.selectElement(selectedContainer);
                        htmlEditor.insertHTML(textSelected, true);
                    }
                }
            }
            else if ( selectedContainer )
            {
                // Recursively search for span with inline style,
                // and remove the style
                var nodeList = selectedContainer.childNodes;
                highlighter.ClearFormatForChilds(nodeList, selectionObj);
            }
            else
            {
                alert(textSelected);
                // htmlEditor.insertHTML(textSelected);
            }
        }
        catch ( exc )
        {
            // alert(exc.message);
        }

        // This is necessary because due to event propagation,
        // the Highlight function is going to be called.
        highlighter.clearFormatCalled = true;
    },

    /* This method is called just after selection (SetCurColor),
    *  or when directly clicking the highlight icon
    */
    Highlight: function()
    {
        try
        {
            // because the clear menu entry is inside the highlight
            // menu, this method is called just after clear.
            // this code is just here to avoid highligh again.
            if ( highlighter.clearFormatCalled )
            {
                highlighter.clearFormatCalled = false;
                return;
            }

            if ( highlighter.IsSelectionMultiple() )
            {
                msgText = "Multiple text selection not yet supported in this version !";
                alert(msgText);
                return;
            }

            // Get the real color from the last picked color
            var realColor = highlighter.GetRealColor(highlighter.curColor);

            // Get the editor object
            var domndEditor = document.getElementById("content-frame");
            var htmlEditor = domndEditor.getHTMLEditor(domndEditor.contentWindow);
            var textSelected = htmlEditor.selection;
            var selectedContainer = htmlEditor.getSelectionContainer();

            if ( textSelected == '' && selectedContainer )
            {
                if ( selectedContainer.hasAttribute('style') )
                {
                    var textStyle="background-color:"+realColor+";";
                    var curStyle = selectedContainer.getAttribute("style");
                    var newStyle = curStyle.replace(/background-color:[^;]+;/i, '');
                    newStyle += textStyle;
                    selectedContainer.setAttribute("style", newStyle);
                }
                else
                {
                    var textStyle="background-color:"+realColor+";";
                    selectedContainer.setAttribute("style", textStyle);
                }
            }
            else if ( textSelected != '' )
            {
                // create the span that will contains the selection, and apply the style
                var span = htmlEditor.createElementWithDefaults('span');
                var textStyle="background-color:"+realColor+";";
                span.setAttribute("style", textStyle);

                // create a text node with the selection, and append it to the span
                var textNode = document.createTextNode(textSelected);
                span.appendChild(textNode);

                // Replace the selection with the element, and select it again.
                htmlEditor.insertElementAtSelection(span, true);
                htmlEditor.selectElement(span);
            }
        }
        catch (e)
        {
            // alert("Exception:\n"+e.message);
        }
    },

    /*** Private Methods ***/

    /* Recursively remove background styles the format for a list of nodes
    */
    ClearFormatForChilds: function(nodeList, selectionObj)
    {
        for ( var c=0 ; c < nodeList.length ; c++ )
        {
            var child = nodeList.item(c);

            if ( child.hasAttributes() )
            {
                var style = child.attributes.getNamedItem('style');

                // The text of an element is always stored inside a child '#text' node
                var nodeText = child.firstChild ? child.firstChild.nodeValue : "" ;

                if ( style  )
                {
                    var nodeInSel = false;

                    // Even if the contains node function is marked as FROZEN inside the current
                    // thunderbird source code, it's not yet have been copied into the official
                    // MDC documentation. It was in the XUL planet, however.
                    if ( typeof(selectionObj.containsNode) != 'undefined' )
                    {
                        try
                        {
                            nodeInSel = selectionObj.containsNode(child, true);
                        }
                        catch ( exc )
                        {
                            nodeInSel = ( selectionObj.toString().indexOf(nodeText) >= 0 );
                        }
                    }
                    else
                        nodeInSel = ( selectionObj.toString().indexOf(nodeText) >= 0 );

                    if ( nodeInSel )
                        style.nodeValue = style.nodeValue.replace(/background-color:[^;]+;/i, '');
                }
            }

            if ( child.hasChildNodes() )
            {
                // Recursively apply the clear format to all nodes.
                highlighter.ClearFormatForChilds(child.childNodes, selectionObj);
            }
        }
    },

    /* Return the real HTML color from a color name,
    */
    GetRealColor: function(colorName)
    {
        // var baseNode = htmlEditor.createElementWithDefaults('span');
        var realColor = highlighter.realColors[colorName];

        // if there is no real color, use the same color as the one provided.
        // however, this is not guarantee to work all the time. In the future,
        // users should be able to add their own colors.
        if ( !realColor ) realColor = colorName;

        return realColor;
    },


    /* Return true or false, according to the fact that multiple
       elements have been selected in the editor.
    */
    IsSelectionMultiple: function()
    {
        var isMultiple = false;

        try
        {
            var domndEditor = document.getElementById("content-frame");
            var htmlEditor = domndEditor.getHTMLEditor(domndEditor.contentWindow);
            var textSelected = htmlEditor.selection;

            var range0 = textSelected.getRangeAt(0);
            var range1 = textSelected.getRangeAt(1);

            if ( range0 && range1 )
                isMultiple = true;
        }
        catch(exc)
        {
            isMultiple = false;
        }

        return isMultiple;
    },

    /* Initialise highlighter: list of colors, etc.
    */
    Initialise: function()
    {
        // Create the list of colors
        highlighter.realColors['yellow']    = '#ff6';
        highlighter.realColors['cyan']      = '#aff';
        highlighter.realColors['green']     = '#9f9';
        highlighter.realColors['pink']      = '#f6f';
        highlighter.realColors['red']       = '#f99';

        // Useful for B&W printing
        highlighter.realColors['lgrey']     = '#ccc';
        highlighter.realColors['dgrey']     = '#999';

        // initialise the default color:
        var curColor = "yellow";
        var curColorAttr = document.getElementById("highlighter-toolbar-button").getAttribute("curColor");
        // alert(curColorAttr);
        if ( curColorAttr ) curColor = curColorAttr.value;
        highlighter.SetCurColor(curColor);

        // Finished
        highlighter.initialised = true;
    },

    /* Release all resources, and exit the plugin
    */
    Release: function()
    {
        // alert('exit');
    },

    /* Return true or false if the highlighter had been initialised.
    */
    Initialised: function()
    {
        return highlighter.initialised;
    }
};

// Initialise the addon on start.
window.addEventListener("load",
    function(e)
    {
        if ( !highlighter.Initialised() )
            highlighter.Initialise();
    },
false);

// Initialise the addon on start.
window.addEventListener("unload",
    function(e)
    {
        highlighter.Release();
    },
false);

