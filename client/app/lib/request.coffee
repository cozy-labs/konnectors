# Make ajax request more easy to do.
# Expected callbacks: success and error
module.exports = request =
    request: (type, url, data, callback) ->
        $.ajax
            type: type
            url: url
            data: if data? then JSON.stringify data else null
            contentType: "application/json"
            dataType: "json"
            success: (data) ->
                callback null, data if callback?
            error: (data) ->
                if data? and data.msg? and callback?
                    callback new Error data.msg
                else if callback?
                    callback new Error "Server error occured"

    # Sends a get request with data as body
    # Expected callbacks: success and error
    get: (url, callback) ->
        request.request "GET", url, null, callback

    # Sends a post request with data as body
    # Expected callbacks: success and error
    postr: (url, data, callback) ->
        request.request "POST", url, data, callback

    # Sends a put request with data as body
    # Expected callbacks: success and error
    put: (url, data, callback) ->
        request.request "PUT", url, data, callback

    # Sends a delete request with data as body
    # Expected callbacks: success and error
    del: (url, callback) ->
        request.request "DELETE", url, null, callback
